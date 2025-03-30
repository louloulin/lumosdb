use clap::{Parser, Subcommand};
use std::path::{Path, PathBuf};
use serde::{Serialize, Deserialize};
use wasmtime::{Engine, Module, Store, Linker, Memory};
use wasmtime_wasi::{WasiCtx, WasiCtxBuilder};
use anyhow::{anyhow, Result};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use std::fs::File;
use std::io::{Write, BufWriter};
use log::{info, warn, error};
use env_logger;
use serde_json::{json, Value};
use uuid::Uuid;
use indicatif::{ProgressBar, ProgressStyle};
use chrono::{Utc, Local, DateTime};
use std::fs;
use csv::Writer as CsvWriter;
use prettytable::{Table, Row, Cell};
use similar::{ChangeTag, TextDiff};
use std::fs::create_dir_all;

// Command line arguments
#[derive(Parser, Debug)]
#[command(author = "Lumos DB Team", about = "Test program for PostgreSQL WASM plugin")]
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
    
    /// Export results to CSV format
    #[arg(long)]
    export_csv: bool,
    
    /// Path to another plugin for comparison
    #[arg(long)]
    compare_with: Option<String>,
    
    /// Filter records by field value (format: field=value)
    #[arg(long)]
    filter: Option<String>,
    
    /// Show detailed record information
    #[arg(long)]
    show_records: bool,
    
    /// Limit the number of records to display
    #[arg(long, default_value = "5")]
    record_limit: usize,
    
    #[clap(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    #[command(about = "Compare two plugins")]
    Compare {
        #[arg(long, required = true, help = "Path to the second WASM plugin for comparison")]
        plugin2: String,
    }
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
#[derive(Debug, Serialize, Deserialize, Clone)]
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

// Function to compare two plugins
fn compare_plugins(
    plugin1_path: &str, 
    plugin2_path: &str, 
    connection: &str,
    database: &str,
    query: &str,
    source_table: &str
) -> Result<ComparisonResult> {
    info!("Comparing plugins:");
    info!("  Plugin 1: {}", plugin1_path);
    info!("  Plugin 2: {}", plugin2_path);
    
    // Run test for first plugin
    let result1 = run_plugin_test(plugin1_path, connection, database, query, source_table)?;
    
    // Run test for second plugin
    let result2 = run_plugin_test(plugin2_path, connection, database, query, source_table)?;
    
    // Compare results
    let comparison = ComparisonResult {
        plugin1: result1.plugin_metadata.clone(),
        plugin2: result2.plugin_metadata.clone(),
        record_count1: result1.extracted_records.len(),
        record_count2: result2.extracted_records.len(),
        transform_count1: result1.transformed_records.len(),
        transform_count2: result2.transformed_records.len(),
        extract_time1: result1.extract_time,
        extract_time2: result2.extract_time,
        transform_time1: result1.transform_time,
        transform_time2: result2.transform_time,
        load_time1: result1.load_time,
        load_time2: result2.load_time,
        total_time1: result1.total_time,
        total_time2: result2.total_time,
        records_matched: compare_records(&result1.extracted_records, &result2.extracted_records),
    };
    
    Ok(comparison)
}

// Function to run a single plugin test
fn run_plugin_test(
    plugin_path: &str,
    connection: &str,
    database: &str,
    query: &str,
    source_table: &str
) -> Result<SinglePluginTestResult> {
    info!("Testing plugin: {}", plugin_path);
    
    // Check if plugin exists
    let plugin_path_obj = Path::new(plugin_path);
    if !plugin_path_obj.exists() {
        return Err(anyhow!("Plugin not found at: {}", plugin_path));
    }
    
    // Initialize WASM environment
    let engine = Engine::default();
    let module = Module::from_file(&engine, plugin_path_obj)?;
    
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
    
    // Get metadata
    let metadata_ptr = get_metadata.call(&mut store, ())?;
    let metadata: PluginMetadata = read_from_memory(&memory, &store, metadata_ptr)?;
    
    // Prepare extraction options
    let mut options = HashMap::new();
    options.insert("table".to_string(), source_table.to_string());
    options.insert("query".to_string(), query.to_string());
    options.insert("connection_string".to_string(), connection.to_string());
    options.insert("database".to_string(), database.to_string());
    
    let extractor_options = ExtractorOptions { options };
    
    // Test extract function
    let total_start = Instant::now();
    let extract_start = Instant::now();
    let options_ptr = write_to_memory(&memory, &mut store, &extractor_options)?;
    
    let mut extracted_records = Vec::new();
    let mut transformed_records = Vec::new();
    let mut extract_time = Duration::default();
    let mut transform_time = Duration::default();
    let mut load_time = Duration::default();
    
    match extract.call(&mut store, options_ptr) {
        Ok(result_ptr) => {
            let records: Vec<DataRecord> = read_from_memory(&memory, &store, result_ptr)?;
            extract_time = extract_start.elapsed();
            extracted_records = records;
        },
        Err(e) => {
            warn!("Extract function failed: {}", e);
            extract_time = extract_start.elapsed();
        }
    }
    
    // Test transform function
    if !extracted_records.is_empty() {
        let transform_start = Instant::now();
        let records_ptr = write_to_memory(&memory, &mut store, &extracted_records)?;
        
        match transform.call(&mut store, records_ptr) {
            Ok(transformed_ptr) => {
                let records: Vec<DataRecord> = read_from_memory(&memory, &store, transformed_ptr)?;
                transform_time = transform_start.elapsed();
                transformed_records = records;
            },
            Err(e) => {
                warn!("Transform function failed: {}", e);
                transform_time = transform_start.elapsed();
                transformed_records = extracted_records.clone();
            }
        }
    }
    
    // Test load function (simplified - we don't actually need results)
    if !transformed_records.is_empty() {
        let mut load_options = HashMap::new();
        load_options.insert("table".to_string(), "output_test".to_string());
        load_options.insert("connection_string".to_string(), connection.to_string());
        load_options.insert("database".to_string(), database.to_string());
        
        let loader_options = LoaderOptions { options: load_options };
        
        let records_ptr = write_to_memory(&memory, &mut store, &transformed_records)?;
        let options_ptr = write_to_memory(&memory, &mut store, &loader_options)?;
        
        let load_start = Instant::now();
        match load.call(&mut store, (records_ptr, options_ptr)) {
            Ok(_) => {
                load_time = load_start.elapsed();
            },
            Err(e) => {
                warn!("Load function failed: {}", e);
                load_time = load_start.elapsed();
            }
        }
    }
    
    let total_time = total_start.elapsed();
    
    Ok(SinglePluginTestResult {
        plugin_metadata: metadata,
        extracted_records,
        transformed_records,
        extract_time,
        transform_time,
        load_time,
        total_time,
    })
}

// Function to compare two sets of records
fn compare_records(records1: &[DataRecord], records2: &[DataRecord]) -> bool {
    if records1.len() != records2.len() {
        return false;
    }
    
    // Compare each record by serializing to JSON and comparing
    for i in 0..records1.len() {
        let json1 = serde_json::to_string(&records1[i]).unwrap_or_default();
        let json2 = serde_json::to_string(&records2[i]).unwrap_or_default();
        
        if json1 != json2 {
            return false;
        }
    }
    
    true
}

// Struct to hold results of a single plugin test
struct SinglePluginTestResult {
    plugin_metadata: PluginMetadata,
    extracted_records: Vec<DataRecord>,
    transformed_records: Vec<DataRecord>,
    extract_time: Duration,
    transform_time: Duration,
    load_time: Duration,
    total_time: Duration,
}

// Struct to hold comparison results
#[derive(Debug)]
struct ComparisonResult {
    plugin1: PluginMetadata,
    plugin2: PluginMetadata,
    record_count1: usize,
    record_count2: usize,
    transform_count1: usize,
    transform_count2: usize,
    extract_time1: Duration,
    extract_time2: Duration,
    transform_time1: Duration,
    transform_time2: Duration,
    load_time1: Duration,
    load_time2: Duration,
    total_time1: Duration,
    total_time2: Duration,
    records_matched: bool,
}

// Function to display comparison results
fn display_comparison(result: &ComparisonResult) {
    let mut table = Table::new();
    
    // Add header
    table.add_row(Row::from(vec![
        Cell::new("Metric"),
        Cell::new(&result.plugin1.name),
        Cell::new(&result.plugin2.name),
        Cell::new("Difference"),
    ]));
    
    // Add version information
    table.add_row(Row::from(vec![
        Cell::new("Version"),
        Cell::new(&result.plugin1.version),
        Cell::new(&result.plugin2.version),
        Cell::new("-"),
    ]));
    
    // Add record counts
    table.add_row(Row::from(vec![
        Cell::new("Records Extracted"),
        Cell::new(&result.record_count1.to_string()),
        Cell::new(&result.record_count2.to_string()),
        Cell::new(&if result.record_count1 == result.record_count2 {
            "Same".to_string()
        } else {
            format!("{:+}", result.record_count2 as i64 - result.record_count1 as i64)
        }),
    ]));
    
    // Add transformed record counts
    table.add_row(Row::from(vec![
        Cell::new("Records Transformed"),
        Cell::new(&result.transform_count1.to_string()),
        Cell::new(&result.transform_count2.to_string()),
        Cell::new(&if result.transform_count1 == result.transform_count2 {
            "Same".to_string()
        } else {
            format!("{:+}", result.transform_count2 as i64 - result.transform_count1 as i64)
        }),
    ]));
    
    // Add timings
    table.add_row(Row::from(vec![
        Cell::new("Extract Time"),
        Cell::new(&format!("{:.2?}", result.extract_time1)),
        Cell::new(&format!("{:.2?}", result.extract_time2)),
        Cell::new(&format!("{:+.1?}", 
            result.extract_time2.as_micros() as i64 - result.extract_time1.as_micros() as i64)),
    ]));
    
    table.add_row(Row::from(vec![
        Cell::new("Transform Time"),
        Cell::new(&format!("{:.2?}", result.transform_time1)),
        Cell::new(&format!("{:.2?}", result.transform_time2)),
        Cell::new(&format!("{:+.1?}", 
            result.transform_time2.as_micros() as i64 - result.transform_time1.as_micros() as i64)),
    ]));
    
    table.add_row(Row::from(vec![
        Cell::new("Load Time"),
        Cell::new(&format!("{:.2?}", result.load_time1)),
        Cell::new(&format!("{:.2?}", result.load_time2)),
        Cell::new(&format!("{:+.1?}", 
            result.load_time2.as_micros() as i64 - result.load_time1.as_micros() as i64)),
    ]));
    
    table.add_row(Row::from(vec![
        Cell::new("Total Time"),
        Cell::new(&format!("{:.2?}", result.total_time1)),
        Cell::new(&format!("{:.2?}", result.total_time2)),
        Cell::new(&format!("{:+.1?}", 
            result.total_time2.as_micros() as i64 - result.total_time1.as_micros() as i64)),
    ]));
    
    // Add data integrity check
    table.add_row(Row::from(vec![
        Cell::new("Data Matched"),
        Cell::new("-"),
        Cell::new("-"),
        Cell::new(if result.records_matched { "Yes" } else { "No" }),
    ]));
    
    // Print table
    table.printstd();
}

fn main() -> Result<()> {
    env_logger::init();
    let args = Args::parse();
    
    // Handle subcommands
    if let Some(cmd) = &args.command {
        match cmd {
            Commands::Compare { plugin2 } => {
                info!("Comparing plugins:");
                info!("  Plugin 1: {}", args.plugin_path);
                info!("  Plugin 2: {}", plugin2);
                
                let result = compare_plugins(
                    &args.plugin_path, 
                    plugin2, 
                    &args.connection,
                    &args.database,
                    &args.query,
                    &args.source_table
                )?;
                
                display_comparison(&result);
                
                if args.save_results {
                    save_comparison_results(&result)?;
                }
                
                return Ok(());
            }
        }
    }
    
    // Regular plugin test
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
        
        // Apply filter if provided
        if let Some(filter) = &args.filter {
            if !args.benchmark {
                info!("Applying filter: {}", filter);
            }
            let filtered_records = filter_records(&records, filter);
            if !args.benchmark {
                info!("Filter applied: {} records remaining", filtered_records.len());
            }
            records = filtered_records;
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
    
    // Display records in table format if not in benchmark mode
    if !args.benchmark && !records.is_empty() {
        info!("Extracted Records:");
        display_records(&records, args.record_limit);
        
        if !transformed_records.is_empty() {
            info!("Transformed Records:");
            display_records(&transformed_records, args.record_limit);
        }
    }
    
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
        performance: benchmark_result.clone(),
        error: error_message,
        success,
        timestamp,
        test_id,
    };
    
    // Save results to file if requested
    if args.save_results {
        // Create output directory if it doesn't exist
        std::fs::create_dir_all("./test_results")?;
        
        // Create output file
        let file_name = format!("./test_results/postgresql_test_{}.json", test_result.test_id);
        let mut file = File::create(&file_name)?;
        
        // Write test results to file
        let json = serde_json::to_string_pretty(&test_result)?;
        file.write_all(json.as_bytes())?;
        
        info!("Test results saved to {}", file_name);
        
        // Export to CSV if requested
        if args.export_csv {
            let csv_file_name = format!("./test_results/postgresql_test_{}.csv", test_result.test_id);
            export_to_csv(&benchmark_result, &csv_file_name)?;
            info!("Benchmark results exported to CSV: {}", csv_file_name);
        }
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

// Function to export benchmark results to CSV
fn export_to_csv(results: &BenchmarkResult, path: &str) -> Result<()> {
    // Create output directory if it doesn't exist
    if let Some(parent) = Path::new(path).parent() {
        std::fs::create_dir_all(parent)?;
    }
    
    // Create CSV writer
    let mut writer = CsvWriter::from_path(path)?;
    
    // Write header
    writer.write_record(&[
        "Iteration", 
        "Extract Time (ms)", 
        "Transform Time (ms)", 
        "Load Time (ms)",
        "Total Time (ms)",
    ])?;
    
    // Write data for each iteration
    let iterations = results.extract_time_ms.len();
    for i in 0..iterations {
        let extract = if i < results.extract_time_ms.len() { 
            results.extract_time_ms[i].to_string() 
        } else { 
            "0".to_string() 
        };
        
        let transform = if i < results.transform_time_ms.len() { 
            results.transform_time_ms[i].to_string() 
        } else { 
            "0".to_string() 
        };
        
        let load = if i < results.load_time_ms.len() { 
            results.load_time_ms[i].to_string() 
        } else { 
            "0".to_string() 
        };
        
        writer.write_record(&[
            (i + 1).to_string(),
            extract,
            transform,
            load,
            (results.extract_time_ms.get(i).unwrap_or(&0) + 
             results.transform_time_ms.get(i).unwrap_or(&0) + 
             results.load_time_ms.get(i).unwrap_or(&0)).to_string(),
        ])?;
    }
    
    // Write summary row
    let avg_extract = if !results.extract_time_ms.is_empty() {
        results.extract_time_ms.iter().sum::<u64>() as f64 / results.extract_time_ms.len() as f64
    } else {
        0.0
    };
    
    let avg_transform = if !results.transform_time_ms.is_empty() {
        results.transform_time_ms.iter().sum::<u64>() as f64 / results.transform_time_ms.len() as f64
    } else {
        0.0
    };
    
    let avg_load = if !results.load_time_ms.is_empty() {
        results.load_time_ms.iter().sum::<u64>() as f64 / results.load_time_ms.len() as f64
    } else {
        0.0
    };
    
    writer.write_record(&[
        "Average".to_string(),
        format!("{:.2}", avg_extract),
        format!("{:.2}", avg_transform),
        format!("{:.2}", avg_load),
        format!("{:.2}", avg_extract + avg_transform + avg_load),
    ])?;
    
    // Write metadata
    writer.write_record(&["", "", "", "", ""])?;
    writer.write_record(&["Metadata", "", "", "", ""])?;
    writer.write_record(&["Plugin Name", &results.plugin_metadata.name, "", "", ""])?;
    writer.write_record(&["Plugin Version", &results.plugin_metadata.version, "", "", ""])?;
    writer.write_record(&["Plugin Type", &results.plugin_metadata.plugin_type, "", "", ""])?;
    writer.write_record(&["Record Count", &results.record_count.to_string(), "", "", ""])?;
    writer.write_record(&["Test ID", &results.test_id, "", "", ""])?;
    writer.write_record(&["Timestamp", &results.timestamp, "", "", ""])?;
    
    // Flush and close the writer
    writer.flush()?;
    
    Ok(())
}

// Function to filter records based on field value
fn filter_records(records: &[DataRecord], filter: &str) -> Vec<DataRecord> {
    // Parse filter string (format: field=value)
    let parts: Vec<&str> = filter.split('=').collect();
    if parts.len() != 2 {
        warn!("Invalid filter format, expected 'field=value'. Using all records.");
        return records.to_vec();
    }
    
    let field_name = parts[0].trim();
    let field_value = parts[1].trim();
    
    // Filter records
    records.iter()
        .filter(|record| {
            // Check in the fields map
            if let Some(value) = record.fields.get(field_name) {
                return value == field_value;
            }
            
            // Check in the base properties
            match field_name {
                "id" => record.id == field_value,
                "source" => record.source == field_value,
                "timestamp" => record.timestamp == field_value,
                _ => false,
            }
        })
        .cloned()
        .collect()
}

// Function to display records in a table format
fn display_records(records: &[DataRecord], limit: usize) {
    if records.is_empty() {
        info!("No records to display");
        return;
    }
    
    // Create a new table
    let mut table = Table::new();
    
    // Add header row
    let mut header = vec!["ID", "Source", "Timestamp"];
    
    // Add fields from the first record to determine columns
    let field_names: Vec<&String> = if !records.is_empty() {
        records[0].fields.keys().collect()
    } else {
        Vec::new()
    };
    
    // Add field names to header
    for field in &field_names {
        header.push(field);
    }
    
    // Add header row to table
    table.add_row(Row::from(header.iter().map(|h| Cell::new(h)).collect::<Vec<_>>()));
    
    // Add data rows
    let display_count = std::cmp::min(limit, records.len());
    for record in records.iter().take(display_count) {
        let mut row = vec![
            Cell::new(&record.id),
            Cell::new(&record.source),
            Cell::new(&record.timestamp),
        ];
        
        // Add fields in the same order as the header
        for field_name in &field_names {
            let empty_string = "".to_string();
            let value = record.fields.get(*field_name).unwrap_or(&empty_string);
            row.push(Cell::new(value));
        }
        
        table.add_row(Row::from(row));
    }
    
    // Print table
    table.printstd();
    
    // Show record count
    if records.len() > display_count {
        info!("Showing {} of {} records", display_count, records.len());
    }
}

// Add this function to save comparison results
fn save_comparison_results(result: &ComparisonResult) -> Result<()> {
    let results_dir = "./test_results";
    create_dir_all(results_dir)?;
    
    let unique_id = Uuid::new_v4();
    let timestamp = Utc::now();
    
    let filename = format!("{}/comparison_{}.json", results_dir, unique_id);
    let file = File::create(&filename)?;
    let mut writer = BufWriter::new(file);
    
    let json_result = json!({
        "plugin1": {
            "name": result.plugin1.name,
            "version": result.plugin1.version,
            "description": result.plugin1.description,
            "type": result.plugin1.plugin_type,
        },
        "plugin2": {
            "name": result.plugin2.name,
            "version": result.plugin2.version,
            "description": result.plugin2.description,
            "type": result.plugin2.plugin_type,
        },
        "performance": {
            "plugin1": {
                "extract_time_ms": result.extract_time1.as_micros() as f64 / 1000.0,
                "transform_time_ms": result.transform_time1.as_micros() as f64 / 1000.0,
                "load_time_ms": result.load_time1.as_micros() as f64 / 1000.0,
                "total_time_ms": result.total_time1.as_micros() as f64 / 1000.0,
            },
            "plugin2": {
                "extract_time_ms": result.extract_time2.as_micros() as f64 / 1000.0,
                "transform_time_ms": result.transform_time2.as_micros() as f64 / 1000.0,
                "load_time_ms": result.load_time2.as_micros() as f64 / 1000.0,
                "total_time_ms": result.total_time2.as_micros() as f64 / 1000.0,
            },
            "difference": {
                "extract_time_ms": (result.extract_time2.as_micros() as i64 - result.extract_time1.as_micros() as i64) as f64 / 1000.0,
                "transform_time_ms": (result.transform_time2.as_micros() as i64 - result.transform_time1.as_micros() as i64) as f64 / 1000.0,
                "load_time_ms": (result.load_time2.as_micros() as i64 - result.load_time1.as_micros() as i64) as f64 / 1000.0,
                "total_time_ms": (result.total_time2.as_micros() as i64 - result.total_time1.as_micros() as i64) as f64 / 1000.0,
            }
        },
        "records": {
            "plugin1_count": result.record_count1,
            "plugin2_count": result.record_count2,
            "matched": result.records_matched,
        },
        "meta": {
            "id": unique_id.to_string(),
            "timestamp": timestamp.to_rfc3339(),
        }
    });
    
    serde_json::to_writer_pretty(&mut writer, &json_result)?;
    writer.flush()?;
    
    info!("Comparison results saved to: {}", filename);
    Ok(())
} 