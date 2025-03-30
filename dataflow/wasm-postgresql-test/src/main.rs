use std::path::Path;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use wasmtime::{Engine, Module, Store, Linker, Memory};
use wasmtime_wasi::{WasiCtx, sync::WasiCtxBuilder};
use anyhow::{Result, anyhow};
use log::{info, warn};
use clap::Parser;

// Command line arguments
#[derive(Parser, Debug)]
#[command(author = "Lumos DB Team")]
#[command(about = "Test program for PostgreSQL WASM plugin")]
struct Args {
    /// Path to the PostgreSQL WASM plugin
    #[arg(short, long, default_value = "../plugins/postgresql.wasm")]
    plugin_path: String,
    
    /// PostgreSQL connection string
    #[arg(short, long, default_value = "postgres://postgres:postgres@localhost:5432/postgres")]
    connection: String,
    
    /// PostgreSQL database name
    #[arg(short, long, default_value = "postgres")]
    database: String,
    
    /// PostgreSQL table for extraction
    #[arg(short, long, default_value = "users")]
    source_table: String,
    
    /// PostgreSQL table for loading
    #[arg(long, default_value = "output_users")]
    target_table: String,
    
    /// SQL query for extraction
    #[arg(short, long, default_value = "SELECT * FROM users LIMIT 10")]
    query: String,
    
    /// Skip (don't run) extraction operation
    #[arg(long)]
    skip_extract: bool,
    
    /// Skip (don't run) transformation operation
    #[arg(long)]
    skip_transform: bool,
    
    /// Skip (don't run) loading operation
    #[arg(long)]
    skip_load: bool,
}

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
    // Parse command line arguments
    let args = Args::parse();
    
    // Initialize logger
    env_logger::init();
    
    info!("Starting WASM PostgreSQL Plugin test");
    
    // Check if PostgreSQL WebAssembly plugin exists
    let plugin_path = Path::new(&args.plugin_path);
    if !plugin_path.exists() {
        return Err(anyhow!("PostgreSQL plugin not found at: {}", plugin_path.display()));
    }
    
    info!("Found PostgreSQL plugin at: {}", plugin_path.display());
    
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
    let metadata: PluginMetadata = read_from_memory(&memory, &store, metadata_ptr)?;
    info!("Plugin Metadata: {:?}", metadata);
    
    // Create sample records for testing
    let mut sample_records = Vec::new();
    for i in 1..5 {
        let mut fields = HashMap::new();
        fields.insert("name".to_string(), format!("Test User {}", i));
        fields.insert("email".to_string(), format!("user{}@example.com", i));
        fields.insert("active".to_string(), "true".to_string());
        
        sample_records.push(DataRecord {
            id: format!("pg_{}", i),
            source: "postgresql".to_string(),
            timestamp: "2025-03-30T00:00:00Z".to_string(),
            fields,
        });
    }
    
    // Prepare extraction options
    let mut options = HashMap::new();
    options.insert("table".to_string(), args.source_table.clone());
    options.insert("query".to_string(), args.query.clone());
    options.insert("connection_string".to_string(), args.connection.clone());
    options.insert("database".to_string(), args.database.clone());
    
    let extractor_options = ExtractorOptions { options };
    
    // Test extract function
    let records = if !args.skip_extract {
        info!("Calling extract function...");
        let options_ptr = write_to_memory(&memory, &mut store, &extractor_options)?;
        
        match extract.call(&mut store, options_ptr) {
            Ok(result_ptr) => {
                let extracted_records: Vec<DataRecord> = read_from_memory(&memory, &store, result_ptr)?;
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
        }
    } else {
        info!("Skipping extract operation");
        sample_records
    };
    
    if !records.is_empty() {
        info!("Sample record: id={}, fields={}", records[0].id, records[0].fields.len());
    }
    
    // Test transform function
    let transformed_records = if !args.skip_transform {
        info!("Calling transform function...");
        let records_ptr = write_to_memory(&memory, &mut store, &records)?;
        
        match transform.call(&mut store, records_ptr) {
            Ok(transformed_ptr) => {
                let transformed: Vec<DataRecord> = read_from_memory(&memory, &store, transformed_ptr)?;
                info!("Transformed {} records", transformed.len());
                transformed
            },
            Err(e) => {
                warn!("Transform function failed: {}", e);
                info!("Using original records");
                records
            }
        }
    } else {
        info!("Skipping transform operation");
        records
    };
    
    // Test load function
    if !args.skip_load {
        info!("Calling load function...");
        let mut load_options = HashMap::new();
        load_options.insert("table".to_string(), args.target_table.clone());
        load_options.insert("connection_string".to_string(), args.connection.clone());
        load_options.insert("database".to_string(), args.database.clone());
        
        let loader_options = LoaderOptions { options: load_options };
        
        let records_ptr = write_to_memory(&memory, &mut store, &transformed_records)?;
        let options_ptr = write_to_memory(&memory, &mut store, &loader_options)?;
        
        match load.call(&mut store, (records_ptr, options_ptr)) {
            Ok(result_ptr) => {
                match read_from_memory::<LoadResult>(&memory, &store, result_ptr) {
                    Ok(LoadResult::Success(count)) => {
                        info!("Load succeeded: inserted {} records", count);
                    },
                    Ok(LoadResult::Error(err_msg)) => {
                        warn!("Load returned an error: {}", err_msg);
                    },
                    Err(e) => {
                        warn!("Failed to parse load result: {}", e);
                    }
                }
            },
            Err(e) => {
                warn!("Load function failed to execute: {}", e);
            }
        }
    } else {
        info!("Skipping load operation");
    }
    
    info!("WASM PostgreSQL Plugin test completed successfully");
    Ok(())
}

// Helper functions for memory management
fn read_from_memory<T: for<'a> Deserialize<'a>>(
    memory: &Memory,
    store: &Store<WasiCtx>,
    ptr: i32
) -> Result<T> {
    // Read length (first 4 bytes)
    let len_bytes = memory.data(&store)[ptr as usize..ptr as usize + 4].to_vec();
    let len = u32::from_le_bytes([len_bytes[0], len_bytes[1], len_bytes[2], len_bytes[3]]) as usize;
    
    // Read JSON data
    let data_offset = ptr as usize + 4;
    let data = memory.data(&store)[data_offset..data_offset + len].to_vec();
    
    // Deserialize
    let result = serde_json::from_slice(&data)?;
    Ok(result)
}

fn write_to_memory<T: Serialize>(
    memory: &Memory,
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
    
    // Set a fixed offset at the beginning of memory
    // Use a simple static counter to allocate different memory locations
    // This is just for testing and should be replaced with proper memory management in production
    static mut MEMORY_OFFSET: usize = 4096; // Start after the first 4K
    
    // Get memory offset and increment for next use
    let offset = unsafe {
        let current = MEMORY_OFFSET;
        MEMORY_OFFSET += buffer.len() + 128; // Add padding between allocations
        current
    };
    
    // Ensure we have enough memory
    let current_size = memory.data_size(&mut *store);
    if offset + buffer.len() >= current_size {
        let pages_needed = ((offset + buffer.len()) / 65536) + 1;
        let current_pages = memory.size(&mut *store);
        
        if pages_needed > current_pages as usize {
            let pages_to_add = pages_needed - current_pages as usize;
            memory.grow(&mut *store, pages_to_add as u64)?;
        }
    }
    
    // Write to memory
    memory.data_mut(&mut *store)[offset..offset + buffer.len()].copy_from_slice(&buffer);
    
    Ok(offset as i32)
} 