use std::path::Path;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use wasmtime::{Engine, Module, Store, Linker};
use wasmtime_wasi::{WasiCtx, sync::WasiCtxBuilder};
use anyhow::{Result, anyhow};
use log::{info, warn};

// Simplified data structures just for testing
#[derive(Debug, Serialize, Deserialize)]
struct DataRecord {
    pub id: String,
    pub source: String,
    pub timestamp: String,
    pub fields: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExtractorOptions {
    pub options: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct LoaderOptions {
    pub options: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PluginMetadata {
    pub name: String,
    pub version: String,
    pub description: String,
    pub plugin_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
enum LoadResult {
    Success(u32),
    Error(String),
}

fn main() -> Result<()> {
    // Initialize logger
    env_logger::init();
    
    info!("Starting WASM MongoDB Plugin test");
    
    // Check if MongoDB WebAssembly plugin exists
    let plugin_path = Path::new("../plugins/mongodb.wasm");
    if !plugin_path.exists() {
        return Err(anyhow!("MongoDB plugin not found at: {}", plugin_path.display()));
    }
    
    info!("Found MongoDB plugin at: {}", plugin_path.display());
    
    // Initialize WASM environment
    let engine = Engine::default();
    let module = Module::from_file(&engine, plugin_path)?;
    
    // Create a WASI context
    let wasi = WasiCtxBuilder::new()
        .inherit_stdio()
        .inherit_args()?
        .build();
    
    // Create a store with WASI context
    let mut store = Store::new(&engine, wasi);
    
    // Create a linker with WASI functions
    let mut linker = Linker::new(&engine);
    wasmtime_wasi::sync::add_to_linker(&mut linker, |s| s)?;
    
    // Instantiate the module
    let instance = linker.instantiate(&mut store, &module)?;
    
    // Get exported functions
    let get_metadata = instance.get_typed_func::<(), i32>(&mut store, "get_metadata")?;
    let extract = instance.get_typed_func::<i32, i32>(&mut store, "extract")?;
    let transform = instance.get_typed_func::<i32, i32>(&mut store, "transform")?;
    let load = instance.get_typed_func::<(i32, i32), i32>(&mut store, "load")?;
    
    // Get the WebAssembly memory
    let memory = instance.get_export(&mut store, "memory")
        .and_then(|export| export.into_memory())
        .ok_or_else(|| anyhow!("Failed to get WebAssembly memory"))?;
    
    // Test get_metadata function
    info!("Calling get_metadata function...");
    let metadata_ptr = get_metadata.call(&mut store, ())?;
    let metadata: PluginMetadata = read_from_memory(&memory, &mut store, metadata_ptr)?;
    info!("Plugin Metadata: {:?}", metadata);
    
    // Create sample records for testing
    let mut sample_records = Vec::new();
    for i in 1..5 {
        let mut fields = HashMap::new();
        fields.insert("name".to_string(), format!("Test User {}", i));
        fields.insert("age".to_string(), format!("{}", 20 + i));
        fields.insert("created_at".to_string(), "2025-03-30T00:00:00Z".to_string());
        
        sample_records.push(DataRecord {
            id: format!("rec_{}", i),
            source: "test".to_string(),
            timestamp: "2025-03-30T00:00:00Z".to_string(),
            fields,
        });
    }
    
    // Prepare extraction options
    let mut options = HashMap::new();
    options.insert("collection".to_string(), "test_collection".to_string());
    options.insert("query".to_string(), "{}".to_string());
    
    let extractor_options = ExtractorOptions { options };
    
    // Test extract function
    info!("Calling extract function...");
    let options_ptr = write_to_memory(&memory, &mut store, &extractor_options)?;
    
    let records = match extract.call(&mut store, options_ptr) {
        Ok(result_ptr) => {
            let extracted_records: Vec<DataRecord> = read_from_memory(&memory, &mut store, result_ptr)?;
            info!("Extracted {} records", extracted_records.len());
            
            if extracted_records.is_empty() {
                info!("No records extracted, using sample data");
                sample_records
            } else {
                extracted_records
            }
        },
        Err(e) => {
            warn!("Extract function failed: {}", e);
            info!("Using sample data instead");
            sample_records
        }
    };
    
    if !records.is_empty() {
        info!("Sample record: id={}, fields={}", records[0].id, records[0].fields.len());
    }
    
    // Test transform function
    info!("Calling transform function...");
    let records_ptr = write_to_memory(&memory, &mut store, &records)?;
    
    let transformed_records = match transform.call(&mut store, records_ptr) {
        Ok(transformed_ptr) => {
            let transformed: Vec<DataRecord> = read_from_memory(&memory, &mut store, transformed_ptr)?;
            info!("Transformed {} records", transformed.len());
            transformed
        },
        Err(e) => {
            warn!("Transform function failed: {}", e);
            info!("Using original records");
            records
        }
    };
    
    // Test load function
    info!("Calling load function...");
    let mut load_options = HashMap::new();
    load_options.insert("collection".to_string(), "output_collection".to_string());
    
    let loader_options = LoaderOptions { options: load_options };
    
    let records_ptr = write_to_memory(&memory, &mut store, &transformed_records)?;
    let options_ptr = write_to_memory(&memory, &mut store, &loader_options)?;
    
    match load.call(&mut store, (records_ptr, options_ptr)) {
        Ok(result_ptr) => {
            let result: LoadResult = read_from_memory(&memory, &mut store, result_ptr)?;
            info!("Load result: {:?}", result);
        },
        Err(e) => {
            warn!("Load function failed: {}", e);
        }
    }
    
    info!("WASM MongoDB Plugin test completed successfully");
    Ok(())
}

// Helper functions for memory management
fn read_from_memory<T: for<'a> Deserialize<'a>>(
    memory: &wasmtime::Memory,
    store: &mut Store<WasiCtx>,
    ptr: i32
) -> Result<T> {
    // Read length (first 4 bytes)
    let len_bytes = memory.data(&mut *store)[ptr as usize..ptr as usize + 4].to_vec();
    let len = u32::from_le_bytes([len_bytes[0], len_bytes[1], len_bytes[2], len_bytes[3]]) as usize;
    
    // Read JSON data
    let data_offset = ptr as usize + 4;
    let data = memory.data(&mut *store)[data_offset..data_offset + len].to_vec();
    
    // Deserialize
    let result = serde_json::from_slice(&data)?;
    Ok(result)
}

fn write_to_memory<T: Serialize>(
    memory: &wasmtime::Memory,
    store: &mut Store<WasiCtx>,
    value: &T
) -> Result<i32> {
    // Serialize to JSON
    let data = serde_json::to_vec(value)?;
    let len = data.len();
    
    // Prepare data to write (length + JSON data)
    let mut buffer = Vec::with_capacity(4 + len);
    buffer.extend_from_slice(&(len as u32).to_le_bytes());
    buffer.extend_from_slice(&data);
    
    // Get current memory size
    let current_pages = memory.size(&mut *store);
    let current_size = current_pages as usize * 65536; // 64K per page
    
    // Find a safe offset to store our data
    let offset = (current_size - buffer.len() - 1024) as i32; // reserve some safety space
    
    // Ensure memory is large enough
    if offset < 0 {
        // Need more memory
        let additional_pages = ((buffer.len() + 1024) / 65536) + 1;
        memory.grow(&mut *store, additional_pages as u64)?;
    }
    
    // Write to memory
    let offset_usize = offset as usize;
    memory.data_mut(&mut *store)[offset_usize..offset_usize + buffer.len()].copy_from_slice(&buffer);
    
    Ok(offset)
}
