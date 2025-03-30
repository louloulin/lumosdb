use std::path::Path;
use std::fs;
use serde::{Serialize, Deserialize};
use wasmtime::{Engine, Module, Store, Instance, Linker, Caller, Extern, TypedFunc};
use anyhow::{Result, anyhow};

// Simplified data structures just for testing
#[derive(Debug, Serialize, Deserialize)]
struct DataRecord {
    fields: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExtractorOptions {
    connection_string: String,
    database: String,
    collection: String,
    query: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
struct LoaderOptions {
    connection_string: String,
    database: String,
    collection: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct PluginMetadata {
    name: String,
    version: String,
    description: String,
    plugin_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct LoadResult {
    success: bool,
    message: String,
    count: i32,
}

fn main() -> Result<()> {
    println!("Starting minimal WASM MongoDB Plugin test");
    
    // Check if MongoDB WebAssembly plugin exists
    let plugin_path = Path::new("plugins/mongodb.wasm");
    if !plugin_path.exists() {
        return Err(anyhow!("MongoDB plugin not found at: {}", plugin_path.display()));
    }
    
    println!("Found MongoDB plugin at: {}", plugin_path.display());
    
    // Initialize WASM environment
    let engine = Engine::default();
    let module = Module::from_file(&engine, plugin_path)?;
    
    // Create a store and linker
    let mut store = Store::new(&engine, ());
    let mut linker = Linker::new(&engine);
    
    // Instantiate the module
    let instance = linker.instantiate(&mut store, &module)?;
    
    // Get exported functions
    let get_metadata = instance.get_typed_func::<(), i32>(&mut store, "get_metadata")?;
    let extract = instance.get_typed_func::<i32, i32>(&mut store, "extract")?;
    let transform = instance.get_typed_func::<i32, i32>(&mut store, "transform")?;
    let load = instance.get_typed_func::<i32, i32>(&mut store, "load")?;
    let allocate = instance.get_typed_func::<i32, i32>(&mut store, "allocate")?;
    let deallocate = instance.get_typed_func::<(i32, i32), ()>(&mut store, "deallocate")?;
    
    println!("Successfully obtained WebAssembly exported functions");
    
    // Get the WebAssembly memory
    let memory = match instance.get_memory(&mut store, "memory") {
        Some(mem) => mem,
        None => return Err(anyhow!("Failed to get WebAssembly memory")),
    };
    
    // Test get_metadata function
    let metadata_ptr = get_metadata.call(&mut store, ())?;
    let metadata = read_from_memory::<PluginMetadata>(&memory, &mut store, metadata_ptr)?;
    println!("Plugin Metadata: {:?}", metadata);
    
    // Prepare extraction options
    let extract_options = ExtractorOptions {
        connection_string: "mongodb://localhost:27017".to_string(),
        database: "test".to_string(),
        collection: "samples".to_string(),
        query: None,
    };
    
    // Test extract function
    let options_ptr = write_to_memory(&extract_options, &memory, &mut store, &allocate)?;
    let result_ptr = extract.call(&mut store, options_ptr)?;
    
    // Read extract result
    let records = read_array_from_memory::<DataRecord>(&memory, &mut store, result_ptr)?;
    println!("Extracted {} records", records.len());
    
    if !records.is_empty() {
        println!("Sample record: {:?}", records[0]);
        
        // Test transform function
        let records_ptr = write_array_to_memory(&records, &memory, &mut store, &allocate)?;
        let transformed_ptr = transform.call(&mut store, records_ptr)?;
        let transformed_records = read_array_from_memory::<DataRecord>(&memory, &mut store, transformed_ptr)?;
        println!("Transformed {} records", transformed_records.len());
        
        // Test load function
        let load_options = LoaderOptions {
            connection_string: "mongodb://localhost:27017".to_string(),
            database: "test".to_string(),
            collection: "output".to_string(),
        };
        
        let load_options_ptr = write_to_memory(&load_options, &memory, &mut store, &allocate)?;
        let data_ptr = write_array_to_memory(&transformed_records, &memory, &mut store, &allocate)?;
        
        // Prepare load input (options + data)
        let load_input = serde_json::json!({
            "options": load_options,
            "data": transformed_records
        });
        let load_input_ptr = write_to_memory(&load_input, &memory, &mut store, &allocate)?;
        
        let load_result_ptr = load.call(&mut store, load_input_ptr)?;
        let load_result = read_from_memory::<LoadResult>(&memory, &mut store, load_result_ptr)?;
        println!("Load result: {:?}", load_result);
    }
    
    println!("Minimal WASM MongoDB Plugin test completed successfully");
    Ok(())
}

// Helper functions for memory management
fn read_from_memory<T: for<'a> Deserialize<'a>>(
    memory: &wasmtime::Memory,
    store: &mut Store<()>,
    ptr: i32
) -> Result<T> {
    // Read length (assuming it's stored as i32 before the actual data)
    let len_offset = ptr as usize;
    let len_bytes = memory.data(store)[len_offset..len_offset + 4].to_vec();
    let len = i32::from_le_bytes([len_bytes[0], len_bytes[1], len_bytes[2], len_bytes[3]]) as usize;
    
    // Read actual data
    let data_offset = len_offset + 4;
    let data = memory.data(store)[data_offset..data_offset + len].to_vec();
    
    // Deserialize
    let result: T = serde_json::from_slice(&data)?;
    Ok(result)
}

fn write_to_memory<T: Serialize>(
    value: &T, 
    memory: &wasmtime::Memory,
    store: &mut Store<()>, 
    allocate: &TypedFunc<i32, i32>
) -> Result<i32> {
    // Serialize to JSON
    let data = serde_json::to_vec(value)?;
    let len = data.len() as i32;
    
    // Allocate memory in the WASM module
    let ptr = allocate.call(store, len + 4)?;
    let offset = ptr as usize;
    
    // Write length as i32 LE bytes
    let len_bytes = len.to_le_bytes();
    memory.data_mut(store)[offset..offset + 4].copy_from_slice(&len_bytes);
    
    // Write actual data
    memory.data_mut(store)[offset + 4..offset + 4 + len as usize].copy_from_slice(&data);
    
    Ok(ptr)
}

fn read_array_from_memory<T: for<'a> Deserialize<'a>>(
    memory: &wasmtime::Memory,
    store: &mut Store<()>,
    ptr: i32
) -> Result<Vec<T>> {
    let data: Vec<T> = read_from_memory(memory, store, ptr)?;
    Ok(data)
}

fn write_array_to_memory<T: Serialize>(
    values: &[T],
    memory: &wasmtime::Memory,
    store: &mut Store<()>,
    allocate: &TypedFunc<i32, i32>
) -> Result<i32> {
    write_to_memory(values, memory, store, allocate)
} 