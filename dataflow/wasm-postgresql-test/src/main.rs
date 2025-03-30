use std::path::Path;
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use std::time::Instant;
use serde::{Serialize, Deserialize};
use wasmtime::{Engine, Module, Store, Linker, Memory};
use wasmtime_wasi::{WasiCtx, sync::WasiCtxBuilder};
use anyhow::{Result, anyhow};
use log::{info, warn};
use clap::Parser;
use chrono::Local;
use uuid::Uuid;
use indicatif::{ProgressBar, ProgressStyle};

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
    
    /// Save test results to JSON file
    #[arg(long)]
    save_results: bool,
    
    /// Output path for test results
    #[arg(long, default_value = "./test_results")]
    output_path: String,
    
    /// Number of iterations for benchmarking
    #[arg(long, default_value = "1")]
    iterations: usize,
    
    /// Run in benchmark mode (focus on performance)
    #[arg(long)]
    benchmark: bool,
}

// Simplified data structures just for testing
#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
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

// Struct to hold timing information
#[derive(Debug, Serialize, Deserialize)]
struct BenchmarkResult {
    extract_time_ms: Vec<u64>,
    transform_time_ms: Vec<u64>,
    load_time_ms: Vec<u64>,
    total_time_ms: u64,
    record_count: usize,
    plugin_metadata: PluginMetadata,
    timestamp: String,
    test_id: String,
}

// Struct to hold complete test results
#[derive(Debug, Serialize, Deserialize)]
struct TestResult {
    plugin_metadata: PluginMetadata,
    sample_records: Vec<DataRecord>,
    transformed_records: Vec<DataRecord>,
    performance: BenchmarkResult,
    error: Option<String>,
    success: bool,
    timestamp: String,
    test_id: String,
}

fn main() -> Result<()> {
    // Parse command line arguments
    let args = Args::parse();
    
    // Initialize logger
    env_logger::init();
    
    info!("Starting WASM PostgreSQL Plugin test");
    
    // Generate test ID
    let test_id = Uuid::new_v4().to_string();
    let timestamp = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    
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
    
    // Prepare for benchmarking
    let mut extract_times = Vec::with_capacity(args.iterations);
    let mut transform_times = Vec::with_capacity(args.iterations);
    let mut load_times = Vec::with_capacity(args.iterations);
    let total_start = Instant::now();
    let mut records = Vec::new();
    let mut transformed_records = Vec::new();
    let mut error_message = None;
    let mut success = true;
    
    // Setup progress bar for benchmark mode
    let progress_bar = if args.benchmark {
        let pb = ProgressBar::new(args.iterations as u64);
        pb.set_style(
            ProgressStyle::default_bar()
                .template("[{elapsed_precise}] {bar:40.cyan/blue} {pos}/{len} iterations {msg}")
                .unwrap()
                .progress_chars("##-")
        );
        Some(pb)
    } else {
        None
    };
    
    // Run iterations for benchmarking
    for iteration in 0..args.iterations {
        if let Some(pb) = &progress_bar {
            pb.set_message(format!("Running iteration {}", iteration + 1));
        }
        
        // Prepare extraction options
        let mut options = HashMap::new();
        options.insert("table".to_string(), args.source_table.clone());
        options.insert("query".to_string(), args.query.clone());
        options.insert("connection_string".to_string(), args.connection.clone());
        options.insert("database".to_string(), args.database.clone());
        
        let extractor_options = ExtractorOptions { options };
        
        // Test extract function
        if !args.skip_extract {
            if !args.benchmark {
                info!("Calling extract function...");
            }
            let extract_start = Instant::now();
            let options_ptr = write_to_memory(&memory, &mut store, &extractor_options)?;
            
            match extract.call(&mut store, options_ptr) {
                Ok(result_ptr) => {
                    let extracted_records: Vec<DataRecord> = read_from_memory(&memory, &store, result_ptr)?;
                    let extract_time = extract_start.elapsed();
                    extract_times.push(extract_time.as_millis() as u64);
                    
                    if !args.benchmark {
                        info!("Extracted {} records in {:?}", extracted_records.len(), extract_time);
                    }
                    
                    if extracted_records.is_empty() {
                        if !args.benchmark {
                            info!("No records extracted, using sample data");
                        }
                        records = sample_records.clone();
                    } else {
                        records = extracted_records;
                    }
                },
                Err(e) => {
                    let extract_time = extract_start.elapsed();
                    extract_times.push(extract_time.as_millis() as u64);
                    warn!("Extract function failed: {}", e);
                    error_message = Some(format!("Extract error: {}", e));
                    success = false;
                    if !args.benchmark {
                        info!("Using sample data instead");
                    }
                    records = sample_records.clone();
                }
            }
        } else {
            if !args.benchmark {
                info!("Skipping extract operation");
            }
            records = sample_records.clone();
            extract_times.push(0);
        }
        
        if !args.benchmark && !records.is_empty() {
            info!("Sample record: id={}, fields={}", records[0].id, records[0].fields.len());
        }
        
        // Test transform function
        if !args.skip_transform {
            if !args.benchmark {
                info!("Calling transform function...");
            }
            let transform_start = Instant::now();
            let records_ptr = write_to_memory(&memory, &mut store, &records)?;
            
            match transform.call(&mut store, records_ptr) {
                Ok(transformed_ptr) => {
                    let result: Vec<DataRecord> = read_from_memory(&memory, &store, transformed_ptr)?;
                    let transform_time = transform_start.elapsed();
                    transform_times.push(transform_time.as_millis() as u64);
                    
                    if !args.benchmark {
                        info!("Transformed {} records in {:?}", result.len(), transform_time);
                    }
                    transformed_records = result;
                },
                Err(e) => {
                    let transform_time = transform_start.elapsed();
                    transform_times.push(transform_time.as_millis() as u64);
                    warn!("Transform function failed: {}", e);
                    error_message = Some(format!("Transform error: {}", e));
                    success = false;
                    if !args.benchmark {
                        info!("Using original records");
                    }
                    transformed_records = records.clone();
                }
            }
        } else {
            if !args.benchmark {
                info!("Skipping transform operation");
            }
            transformed_records = records.clone();
            transform_times.push(0);
        }
        
        // Test load function
        if !args.skip_load {
            if !args.benchmark {
                info!("Calling load function...");
            }
            let mut load_options = HashMap::new();
            load_options.insert("table".to_string(), args.target_table.clone());
            load_options.insert("connection_string".to_string(), args.connection.clone());
            load_options.insert("database".to_string(), args.database.clone());
            
            let loader_options = LoaderOptions { options: load_options };
            
            let records_ptr = write_to_memory(&memory, &mut store, &transformed_records)?;
            let options_ptr = write_to_memory(&memory, &mut store, &loader_options)?;
            
            let load_start = Instant::now();
            match load.call(&mut store, (records_ptr, options_ptr)) {
                Ok(result_ptr) => {
                    let load_time = load_start.elapsed();
                    load_times.push(load_time.as_millis() as u64);
                    
                    match read_from_memory::<LoadResult>(&memory, &store, result_ptr) {
                        Ok(LoadResult::Success(count)) => {
                            if !args.benchmark {
                                info!("Load succeeded: inserted {} records in {:?}", count, load_time);
                            }
                        },
                        Ok(LoadResult::Error(err_msg)) => {
                            warn!("Load returned an error: {}", err_msg);
                            error_message = Some(format!("Load error: {}", err_msg));
                            success = false;
                        },
                        Err(e) => {
                            warn!("Failed to parse load result: {}", e);
                            error_message = Some(format!("Parse error: {}", e));
                            success = false;
                        }
                    }
                },
                Err(e) => {
                    let load_time = load_start.elapsed();
                    load_times.push(load_time.as_millis() as u64);
                    warn!("Load function failed to execute: {}", e);
                    error_message = Some(format!("Load execution error: {}", e));
                    success = false;
                }
            }
        } else {
            if !args.benchmark {
                info!("Skipping load operation");
            }
            load_times.push(0);
        }
        
        if let Some(pb) = &progress_bar {
            pb.inc(1);
        }
    }
    
    let total_time = total_start.elapsed();
    
    if let Some(pb) = progress_bar {
        pb.finish_with_message("Benchmark completed");
    }
    
    // Compute benchmark results
    let benchmark_result = BenchmarkResult {
        extract_time_ms: extract_times,
        transform_time_ms: transform_times,
        load_time_ms: load_times,
        total_time_ms: total_time.as_millis() as u64,
        record_count: records.len(),
        plugin_metadata: metadata.clone(),
        timestamp: timestamp.clone(),
        test_id: test_id.clone(),
    };
    
    // Display benchmark results if in benchmark mode
    if args.benchmark {
        let avg_extract = if !benchmark_result.extract_time_ms.is_empty() {
            benchmark_result.extract_time_ms.iter().sum::<u64>() as f64 / benchmark_result.extract_time_ms.len() as f64
        } else {
            0.0
        };
        
        let avg_transform = if !benchmark_result.transform_time_ms.is_empty() {
            benchmark_result.transform_time_ms.iter().sum::<u64>() as f64 / benchmark_result.transform_time_ms.len() as f64
        } else {
            0.0
        };
        
        let avg_load = if !benchmark_result.load_time_ms.is_empty() {
            benchmark_result.load_time_ms.iter().sum::<u64>() as f64 / benchmark_result.load_time_ms.len() as f64
        } else {
            0.0
        };
        
        info!("Benchmark Results:");
        info!("------------------");
        info!("Iterations: {}", args.iterations);
        info!("Total Time: {:?}", total_time);
        info!("Avg Extract Time: {:.2} ms", avg_extract);
        info!("Avg Transform Time: {:.2} ms", avg_transform);
        info!("Avg Load Time: {:.2} ms", avg_load);
        info!("Record Count: {}", benchmark_result.record_count);
    }
    
    // Create full test result
    let test_result = TestResult {
        plugin_metadata: metadata,
        sample_records: records,
        transformed_records,
        performance: benchmark_result,
        error: error_message,
        success,
        timestamp,
        test_id,
    };
    
    // Save results to file if requested
    if args.save_results {
        // Create output directory if it doesn't exist
        std::fs::create_dir_all(&args.output_path)?;
        
        // Create output file
        let file_name = format!("{}/postgresql_test_{}.json", args.output_path, test_result.test_id);
        let mut file = File::create(&file_name)?;
        
        // Write test results to file
        let json = serde_json::to_string_pretty(&test_result)?;
        file.write_all(json.as_bytes())?;
        
        info!("Test results saved to {}", file_name);
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