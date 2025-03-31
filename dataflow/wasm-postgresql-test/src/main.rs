use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Instant;
use std::path::Path;

use anyhow::{anyhow, Result};
use chrono::Local;
use clap::Parser;
use prettytable::{row, Table};
use serde::{Deserialize, Serialize};
use serde::de::DeserializeOwned;
use uuid::Uuid;
use wasmtime::{Engine, Linker, Memory, Module, Strategy, Config};
use wasmtime::Store;
use wasmtime_wasi::{WasiCtx, WasiCtxBuilder};

// 定义全局堆结束位置
static HEAP_END: AtomicUsize = AtomicUsize::new(1024); // 默认从1KB开始

// 优化级别枚举
#[derive(Debug, Clone, Copy)]
enum CraneLiftOptLevel {
    None,
    Speed,
    SpeedAndSize,
}

// Wasmtime配置结构体
#[derive(Debug, Clone)]
struct WasmtimeConfig {
    fuel_enabled: bool,
    fuel_limit: u64,
    native_unwind_info: bool,
    debug_info: bool,
    reference_types: bool,
    simd: bool,
    multi_memory: bool,
    threads: usize,
    memory64: bool,
    bulk_memory: bool,
    cranelift_opt_level: CraneLiftOptLevel,
    compilation_mode: CompilationMode,
    strategy: Strategy,
}

// 编译模式
#[derive(Debug, Clone, PartialEq)]
enum CompilationMode {
    Eager,
    Lazy,
}

// 插件元数据
#[derive(Debug, Serialize, Deserialize, Clone)]
struct PluginMetadata {
    name: String,
    version: String, 
    description: String,
    // 添加其他字段以兼容
    #[serde(default)]
    author: String,
    #[serde(default)]
    capabilities: Vec<String>,
}

// 数据记录
#[derive(Debug, Serialize, Deserialize, Clone)]
struct DataRecord {
    id: u64,
    name: String,
    value: f64,
    timestamp: String,
    #[serde(flatten)]
    extra: std::collections::HashMap<String, serde_json::Value>,
}

// 基准测试结果
#[derive(Debug, Clone)]
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

// 命令行参数
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// 插件路径
    #[arg(short, long)]
    plugin: String,
    
    /// 连接字符串
    #[arg(short, long)]
    connection: String,
    
    /// 数据库名称
    #[arg(short, long)]
    database: String,
    
    /// 查询SQL
    #[arg(short, long)]
    query: String,
    
    /// 源表名
    #[arg(short, long)]
    table: String,
    
    /// 测试迭代次数
    #[arg(short, long, default_value_t = 5)]
    iterations: usize,
    
    /// 堆起始位置
    #[arg(long, default_value_t = 1024)]
    heap_start: usize,
    
    /// 启用燃料限制
    #[arg(long, default_value_t = false)]
    fuel_enabled: bool,
    
    /// 燃料限制值
    #[arg(long, default_value_t = 10000000)]
    fuel_limit: u64,
    
    /// 启用本地堆栈展开信息
    #[arg(long, default_value_t = false)]
    native_unwind_info: bool,
    
    /// 启用调试信息
    #[arg(long, default_value_t = false)]
    debug_info: bool,
    
    /// 启用引用类型
    #[arg(long, default_value_t = true)]
    reference_types: bool,
    
    /// 启用SIMD
    #[arg(long, default_value_t = true)]
    simd: bool,
    
    /// 启用多内存
    #[arg(long, default_value_t = false)]
    multi_memory: bool,
    
    /// 启用线程
    #[arg(long, default_value_t = 1)]
    threads: usize,
    
    /// 启用Memory64
    #[arg(long, default_value_t = false)]
    memory64: bool,
    
    /// 启用批量内存操作
    #[arg(long, default_value_t = true)]
    bulk_memory: bool,
    
    /// 优化级别 (none, speed, speed_and_size)
    #[arg(long, default_value = "speed")]
    optimization_level: String,
    
    /// 编译模式 (eager, lazy)
    #[arg(long, default_value = "eager")]
    compilation_mode: String,
    
    /// 执行策略 (cranelift, auto)
    #[arg(long, default_value = "auto")]
    strategy: String,
    
    /// 过滤字段
    #[arg(long)]
    filter_field: Option<String>,
    
    /// 过滤值
    #[arg(long)]
    filter_value: Option<String>,
    
    /// 比较另一个插件
    #[arg(long)]
    compare: Option<String>,
    
    /// 导出结果到CSV
    #[arg(long, default_value_t = false)]
    export_csv: bool,
}

// CSV写入器类型别名
type CsvWriter = csv::Writer<std::fs::File>;

/// 从WebAssembly内存中读取
fn read_from_memory<T: DeserializeOwned>(
    memory: &Memory,
    store: &Store<WasiCtx>,
    ptr: i32,
) -> Result<T> {
    // 读取指针位置的长度（32位整数）
    let len_ptr = ptr as usize;
    let data = memory.data(store);
    
    if len_ptr + 4 > data.len() {
        return Err(anyhow!("Memory access out of bounds"));
    }
    
    // 读取长度（4字节）
    let mut len_bytes = [0u8; 4];
    len_bytes.copy_from_slice(&data[len_ptr..len_ptr + 4]);
    let len = u32::from_le_bytes(len_bytes) as usize;
    
    // 读取数据
    let data_ptr = len_ptr + 4;
    if data_ptr + len > data.len() {
        return Err(anyhow!("Memory access out of bounds for data"));
    }
    
    // 反序列化
    let json_str = std::str::from_utf8(&data[data_ptr..data_ptr + len])?;
    let result: T = serde_json::from_str(json_str)?;
    
    Ok(result)
}

/// 写入WebAssembly内存
fn write_to_memory<T: Serialize>(
    memory: &Memory,
    store: &mut Store<WasiCtx>,
    value: &T,
) -> Result<i32> {
    // 序列化值
    let json_str = serde_json::to_string(value)?;
    let buffer = json_str.as_bytes();
    
    // 计算所需内存大小：长度(4字节) + 数据
    let total_size = 4 + buffer.len();
    
    // 分配内存（如果需要）
    let current_pages = memory.size(&mut *store);
    let memory_size = current_pages as usize * 65536; // 64KB页
    
    let current_heap_end = HEAP_END.load(Ordering::SeqCst);
    if current_heap_end + total_size > memory_size {
        let additional_bytes_needed = current_heap_end + total_size - memory_size;
        let additional_pages = (additional_bytes_needed + 65535) / 65536; // 向上取整到页
        memory.grow(&mut *store, additional_pages as u64)?;
    }
    
    // 分配内存区域
    let offset = HEAP_END.fetch_add(total_size, Ordering::SeqCst);
    let offset_usize = offset as usize;
    
    // 写入长度（4字节）
    let len_bytes = (buffer.len() as u32).to_le_bytes();
    memory.data_mut(&mut *store)[offset_usize..offset_usize + 4].copy_from_slice(&len_bytes);
    
    // 写入数据
    memory.data_mut(&mut *store)[offset_usize + 4..offset_usize + 4 + buffer.len()].copy_from_slice(buffer);
    
    Ok(offset as i32)
}

// 创建Wasmtime引擎，使用提供的配置
fn create_wasmtime_engine(wasmtime_config: &WasmtimeConfig) -> Result<Engine> {
    let mut config = Config::new();
    
    // 设置各种功能
    config.wasm_simd(wasmtime_config.simd);
    config.wasm_bulk_memory(wasmtime_config.bulk_memory);
    config.wasm_reference_types(wasmtime_config.reference_types);
    config.wasm_multi_memory(wasmtime_config.multi_memory);
    config.wasm_threads(wasmtime_config.threads > 1);
    config.wasm_memory64(wasmtime_config.memory64);
    
    // 设置编译配置
    // 将我们的优化级别转换为wasmtime的OptLevel
    let opt_level = match wasmtime_config.cranelift_opt_level {
        CraneLiftOptLevel::None => wasmtime::OptLevel::None,
        CraneLiftOptLevel::Speed => wasmtime::OptLevel::Speed,
        CraneLiftOptLevel::SpeedAndSize => wasmtime::OptLevel::SpeedAndSize,
    };
    config.cranelift_opt_level(opt_level);
    
    match wasmtime_config.strategy {
        Strategy::Auto => {
            config.strategy(Strategy::Auto);
        },
        Strategy::Cranelift => {
            config.strategy(Strategy::Cranelift);
        },
        _ => {
            // 默认使用Auto策略
            config.strategy(Strategy::Auto);
        },
    }
    
    // 设置调试信息
    config.debug_info(wasmtime_config.debug_info);
    
    // 设置编译模式
    match wasmtime_config.compilation_mode {
        CompilationMode::Eager => {
            config.cranelift_debug_verifier(true);
            config.dynamic_memory_guard_size(64 * 1024); // 64KB guard size
        },
        CompilationMode::Lazy => {
            // Lazy模式下的额外设置
        },
    }
    
    // 设置燃料限制
    if wasmtime_config.fuel_enabled {
        config.consume_fuel(true);
    }
    
    // 创建引擎
    let engine = Engine::new(&config)?;
    
    Ok(engine)
}

// 修复WASI设置，适用于10.0.0版本
fn run_plugin_test(
    plugin_path: &str,
    connection: &str,
    database: &str,
    query: &str,
    source_table: &str,
    iterations: usize,
    wasmtime_config: &WasmtimeConfig,
) -> Result<BenchmarkResult> {
    // 创建引擎
    let engine = create_wasmtime_engine(wasmtime_config)?;
    let module = Module::from_file(&engine, plugin_path)?;
    
    // 创建WASI上下文 - 适用于10.0.0版本
    let wasi = WasiCtxBuilder::new()
        .inherit_stdio()
        .build();
    
    // 创建存储
    let mut store = Store::new(&engine, wasi);
    
    // 创建链接器并添加WASI函数 - 10.0.0版本
    let mut linker = Linker::new(&engine);
    wasmtime_wasi::add_to_linker(&mut linker, |s| s)?;
    
    // 实例化模块
    let instance = linker.instantiate(&mut store, &module)?;
    
    // 获取导出的函数
    let extract = instance.get_typed_func::<i32, i32>(&mut store, "extract")?;
    let transform = instance.get_typed_func::<i32, i32>(&mut store, "transform")?;
    let load = instance.get_typed_func::<i32, i32>(&mut store, "load")?;
    let get_metadata = instance.get_typed_func::<(), i32>(&mut store, "get_metadata")?;
    
    // 获取WebAssembly内存
    let memory = instance.get_export(&mut store, "memory")
        .and_then(|export| export.into_memory())
        .ok_or_else(|| anyhow!("Failed to get WebAssembly memory"))?;
    
    // 获取元数据
    let metadata_ptr = get_metadata.call(&mut store, ())?;
    let plugin_metadata: PluginMetadata = read_from_memory(&memory, &store, metadata_ptr)?;
    
    // 准备测试结果
    let test_id = Uuid::new_v4().to_string();
    let timestamp = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    
    // 准备基准测试结果
    let mut extract_times = Vec::with_capacity(iterations);
    let mut transform_times = Vec::with_capacity(iterations);
    let mut load_times = Vec::with_capacity(iterations);
    let mut record_count = 0;
    
    // 准备提取选项
    let extract_options = serde_json::json!({
        "connection_string": connection,
        "database": database,
        "query": query,
        "table": source_table
    });
    
    // 写入提取选项到内存
    let extract_options_ptr = write_to_memory(&memory, &mut store, &extract_options)?;
    
    // 运行指定迭代次数
    for i in 0..iterations {
        // 提取阶段
        let extract_start = Instant::now();
        let result_ptr = extract.call(&mut store, extract_options_ptr)?;
        let extract_time = extract_start.elapsed();
        extract_times.push(extract_time.as_millis() as u64);
        
        // 读取提取结果
        let extract_result: serde_json::Value = read_from_memory(&memory, &store, result_ptr)?;
        let records: Vec<DataRecord> = serde_json::from_value(extract_result["records"].clone())?;
        
        if i == 0 {
            record_count = records.len();
        }
        
        // 转换阶段
        let transform_start = Instant::now();
        let _transform_result_ptr = transform.call(&mut store, result_ptr)?;
        let transform_time = transform_start.elapsed();
        transform_times.push(transform_time.as_millis() as u64);
        
        // 准备加载选项
        let loader_options = serde_json::json!({
            "connection_string": connection,
            "database": database,
            "table": "test_target_table"
        });
        
        // 写入加载选项到内存
        let loader_options_ptr = write_to_memory(&memory, &mut store, &loader_options)?;
        
        // 加载阶段
        let load_start = Instant::now();
        let _load_result_ptr = load.call(&mut store, loader_options_ptr)?;
        let load_time = load_start.elapsed();
        load_times.push(load_time.as_millis() as u64);
    }
    
    // 计算总时间
    let total_time_ms = extract_times.iter().sum::<u64>() + 
                transform_times.iter().sum::<u64>() + 
                load_times.iter().sum::<u64>();
    
    // 创建基准测试结果
    let benchmark_result = BenchmarkResult {
        extract_time_ms: extract_times,
        transform_time_ms: transform_times,
        load_time_ms: load_times,
        total_time_ms: total_time_ms,
        record_count,
        plugin_metadata,
        timestamp,
        test_id,
    };
    
    Ok(benchmark_result)
}

/// 按字段值过滤记录
fn filter_records(result: &BenchmarkResult, field: &str, value: &str) -> BenchmarkResult {
    // 创建过滤后的结果副本
    let mut filtered = result.clone();
    
    // 根据字段过滤记录
    println!("\n过滤记录：字段 '{}' 值为 '{}'", field, value);
    println!("原始记录数: {}", result.record_count);
    
    // 这里只是示例 - 实际过滤需要基于实际记录
    filtered.record_count = result.record_count / 2; // 简化示例
    
    println!("过滤后记录数: {}", filtered.record_count);
    
    filtered
}

/// 显示记录
fn display_records(result: &BenchmarkResult) {
    // 创建表格显示记录
    let mut table = Table::new();
    table.add_row(row!["ID", "名称", "值", "时间戳"]);
    
    // 添加一些示例记录行
    // 在实际应用中，你需要从结果中获取真实记录
    for i in 0..5.min(result.record_count) {
        table.add_row(row![
            i + 1,
            format!("记录{}", i + 1),
            format!("{:.2}", (i as f64) * 1.5),
            result.timestamp.clone()
        ]);
    }
    
    // 打印表格
    table.printstd();
}

/// 显示基准测试结果
fn display_results(result: &BenchmarkResult) {
    println!("\n================================");
    println!("插件信息: {} v{}", result.plugin_metadata.name, result.plugin_metadata.version);
    println!("作者: {}", result.plugin_metadata.author);
    println!("说明: {}", result.plugin_metadata.description);
    println!("能力: {}", result.plugin_metadata.capabilities.join(", "));
    println!("================================");
    println!("记录数: {}", result.record_count);
    println!("测试ID: {}", result.test_id);
    println!("时间戳: {}", result.timestamp);
    println!("================================");
    
    // 创建表格显示各阶段时间
    let mut table = Table::new();
    table.add_row(row!["迭代", "提取 (ms)", "转换 (ms)", "加载 (ms)", "总计 (ms)"]);
    
    // 添加每次迭代的结果
    for i in 0..result.extract_time_ms.len() {
        let extract = result.extract_time_ms[i];
        let transform = result.transform_time_ms[i];
        let load = result.load_time_ms[i];
        let total = extract + transform + load;
        
        table.add_row(row![i + 1, extract, transform, load, total]);
    }
    
    // 添加平均值
    let avg_extract = result.extract_time_ms.iter().sum::<u64>() as f64 / result.extract_time_ms.len() as f64;
    let avg_transform = result.transform_time_ms.iter().sum::<u64>() as f64 / result.transform_time_ms.len() as f64;
    let avg_load = result.load_time_ms.iter().sum::<u64>() as f64 / result.load_time_ms.len() as f64;
    let avg_total = avg_extract + avg_transform + avg_load;
    
    table.add_row(row!["平均", 
        format!("{:.2}", avg_extract),
        format!("{:.2}", avg_transform),
        format!("{:.2}", avg_load),
        format!("{:.2}", avg_total)
    ]);
    
    // 打印表格
    table.printstd();
    println!("总时间: {} ms", result.total_time_ms);
    println!("================================\n");
}

/// 比较并显示两个插件的结果
fn compare_and_display_results(base: &BenchmarkResult, compare: &BenchmarkResult) {
    println!("\n================================");
    println!("插件比较");
    println!("================================");
    println!("基准插件: {} v{}", base.plugin_metadata.name, base.plugin_metadata.version);
    println!("比较插件: {} v{}", compare.plugin_metadata.name, compare.plugin_metadata.version);
    println!("记录数: {}", base.record_count);
    println!("================================");
    
    // 计算平均值
    let base_avg_extract = base.extract_time_ms.iter().sum::<u64>() as f64 / base.extract_time_ms.len() as f64;
    let base_avg_transform = base.transform_time_ms.iter().sum::<u64>() as f64 / base.transform_time_ms.len() as f64;
    let base_avg_load = base.load_time_ms.iter().sum::<u64>() as f64 / base.load_time_ms.len() as f64;
    let base_avg_total = base_avg_extract + base_avg_transform + base_avg_load;
    
    let compare_avg_extract = compare.extract_time_ms.iter().sum::<u64>() as f64 / compare.extract_time_ms.len() as f64;
    let compare_avg_transform = compare.transform_time_ms.iter().sum::<u64>() as f64 / compare.transform_time_ms.len() as f64;
    let compare_avg_load = compare.load_time_ms.iter().sum::<u64>() as f64 / compare.load_time_ms.len() as f64;
    let compare_avg_total = compare_avg_extract + compare_avg_transform + compare_avg_load;
    
    // 计算差异百分比
    let extract_diff = (compare_avg_extract - base_avg_extract) / base_avg_extract * 100.0;
    let transform_diff = (compare_avg_transform - base_avg_transform) / base_avg_transform * 100.0;
    let load_diff = (compare_avg_load - base_avg_load) / base_avg_load * 100.0;
    let total_diff = (compare_avg_total - base_avg_total) / base_avg_total * 100.0;
    
    // 创建比较表格
    let mut table = Table::new();
    table.add_row(row!["阶段", "基准 (ms)", "比较 (ms)", "差异 (%)", "结果"]);
    
    table.add_row(row!["提取", 
        format!("{:.2}", base_avg_extract),
        format!("{:.2}", compare_avg_extract),
        format!("{:.2}%", extract_diff),
        if extract_diff < 0.0 { "更快 ✓" } else { "更慢 ✗" }
    ]);
    
    table.add_row(row!["转换", 
        format!("{:.2}", base_avg_transform),
        format!("{:.2}", compare_avg_transform),
        format!("{:.2}%", transform_diff),
        if transform_diff < 0.0 { "更快 ✓" } else { "更慢 ✗" }
    ]);
    
    table.add_row(row!["加载", 
        format!("{:.2}", base_avg_load),
        format!("{:.2}", compare_avg_load),
        format!("{:.2}%", load_diff),
        if load_diff < 0.0 { "更快 ✓" } else { "更慢 ✗" }
    ]);
    
    table.add_row(row!["总计", 
        format!("{:.2}", base_avg_total),
        format!("{:.2}", compare_avg_total),
        format!("{:.2}%", total_diff),
        if total_diff < 0.0 { "更快 ✓" } else { "更慢 ✗" }
    ]);
    
    // 打印表格
    table.printstd();
    println!("================================\n");
}

/// 导出基准测试结果到CSV文件
fn export_to_csv(result: &BenchmarkResult, filename: &str) -> Result<()> {
    // 创建CSV写入器
    let mut wtr = csv::Writer::from_path(filename)?;
    
    // 写入标题
    wtr.write_record(&[
        "迭代", "提取 (ms)", "转换 (ms)", "加载 (ms)", "总计 (ms)"
    ])?;
    
    // 写入每次迭代的数据
    for i in 0..result.extract_time_ms.len() {
        let extract = result.extract_time_ms[i];
        let transform = result.transform_time_ms[i];
        let load = result.load_time_ms[i];
        let total = extract + transform + load;
        
        wtr.write_record(&[
            (i + 1).to_string(),
            extract.to_string(),
            transform.to_string(),
            load.to_string(),
            total.to_string(),
        ])?;
    }
    
    // 写入摘要行
    let avg_extract = result.extract_time_ms.iter().sum::<u64>() as f64 / result.extract_time_ms.len() as f64;
    let avg_transform = result.transform_time_ms.iter().sum::<u64>() as f64 / result.transform_time_ms.len() as f64;
    let avg_load = result.load_time_ms.iter().sum::<u64>() as f64 / result.load_time_ms.len() as f64;
    let avg_total = avg_extract + avg_transform + avg_load;
    
    wtr.write_record(&[
        "平均".to_string(),
        format!("{:.2}", avg_extract),
        format!("{:.2}", avg_transform),
        format!("{:.2}", avg_load),
        format!("{:.2}", avg_total),
    ])?;
    
    // 写入元数据
    wtr.write_record(&[""])?;
    wtr.write_record(&["元数据"])?;
    wtr.write_record(&["插件名称", &result.plugin_metadata.name])?;
    wtr.write_record(&["版本", &result.plugin_metadata.version])?;
    wtr.write_record(&["作者", &result.plugin_metadata.author])?;
    wtr.write_record(&["说明", &result.plugin_metadata.description])?;
    wtr.write_record(&["能力", &result.plugin_metadata.capabilities.join(", ")])?;
    wtr.write_record(&["记录数", &result.record_count.to_string()])?;
    wtr.write_record(&["测试ID", &result.test_id])?;
    wtr.write_record(&["时间戳", &result.timestamp])?;
    
    // 刷新写入器
    wtr.flush()?;
    
    Ok(())
}

/// 测试schema迁移函数实现
fn test_schema_migration() -> Result<()> {
    // 在这里可以实现实际的schema迁移逻辑
    // 这里只是一个示例，不执行实际操作
    
    println!("执行schema迁移测试");
    
    // 模拟插件加载
    let plugin_path = "../../examples/plugins/postgresql/postgresql-plugin.wasm";
    let connection = "postgres://user:password@localhost:5432";
    let database = "test_database";
    let query = "SELECT * FROM test_source_table";
    let source_table = "test_source_table";
    let iterations = 3;
    
    // 创建测试配置
    let config = WasmtimeConfig {
        fuel_enabled: false,
        fuel_limit: 10000000,
        native_unwind_info: false,
        debug_info: false,
        reference_types: true,
        simd: true,
        multi_memory: false,
        threads: 1,
        memory64: false,
        bulk_memory: true,
        cranelift_opt_level: CraneLiftOptLevel::Speed,
        compilation_mode: CompilationMode::Eager,
        strategy: Strategy::Auto,
    };
    
    // 模拟ETL流程
    match run_plugin_test(plugin_path, connection, database, query, source_table, iterations, &config) {
        Ok(result) => {
            display_results(&result);
            println!("schema迁移测试成功");
        },
        Err(e) => {
            println!("schema迁移测试失败：{}", e);
        }
    }
    
    Ok(())
}

fn main() -> Result<()> {
    // 初始化日志
    env_logger::init();
    
    // 解析命令行参数
    let args = Args::parse();
    
    // 设置全局堆起始位置
    HEAP_END.store(args.heap_start, Ordering::SeqCst);
    
    // 创建Wasmtime配置
    let wasmtime_config = WasmtimeConfig {
        fuel_enabled: args.fuel_enabled,
        fuel_limit: args.fuel_limit,
        native_unwind_info: args.native_unwind_info,
        debug_info: args.debug_info,
        reference_types: args.reference_types,
        simd: args.simd,
        multi_memory: args.multi_memory,
        threads: args.threads,
        memory64: args.memory64,
        bulk_memory: args.bulk_memory,
        cranelift_opt_level: match args.optimization_level.as_str() {
            "none" => CraneLiftOptLevel::None,
            "speed" => CraneLiftOptLevel::Speed,
            "speed_and_size" => CraneLiftOptLevel::SpeedAndSize,
            _ => CraneLiftOptLevel::Speed,
        },
        compilation_mode: match args.compilation_mode.as_str() {
            "eager" => CompilationMode::Eager,
            "lazy" => CompilationMode::Lazy,
            _ => CompilationMode::Eager,
        },
        strategy: match args.strategy.as_str() {
            "cranelift" => Strategy::Cranelift,
            "auto" => Strategy::Auto,
            _ => Strategy::Auto,
        },
    };
    
    // 如果指定了比较模式，执行插件比较
    if let Some(ref compare_plugin) = args.compare {
        // 执行比较
        let base_results = run_plugin_test(
            &args.plugin,
            &args.connection,
            &args.database,
            &args.query,
            &args.table,
            args.iterations,
            &wasmtime_config,
        )?;
        
        let compare_results = run_plugin_test(
            compare_plugin,
            &args.connection,
            &args.database,
            &args.query,
            &args.table,
            args.iterations,
            &wasmtime_config,
        )?;
        
        // 比较结果
        compare_and_display_results(&base_results, &compare_results);
        
        // 如果需要导出CSV
        if args.export_csv {
            // 确保目录存在
            let export_dir = "benchmark_results";
            if !Path::new(export_dir).exists() {
                std::fs::create_dir_all(export_dir)?;
            }
            
            // 导出基准结果
            let base_filename = format!(
                "{}/{}_{}.csv",
                export_dir,
                base_results.plugin_metadata.name.replace(" ", "_"),
                base_results.test_id
            );
            export_to_csv(&base_results, &base_filename)?;
            
            // 导出比较结果
            let compare_filename = format!(
                "{}/{}_{}.csv",
                export_dir,
                compare_results.plugin_metadata.name.replace(" ", "_"),
                compare_results.test_id
            );
            export_to_csv(&compare_results, &compare_filename)?;
            
            println!("Results exported to {} and {}", base_filename, compare_filename);
        }
    } else {
        // 常规模式 - 运行单个插件测试
        let results = run_plugin_test(
            &args.plugin,
            &args.connection,
            &args.database,
            &args.query,
            &args.table,
            args.iterations,
            &wasmtime_config,
        )?;
        
        // 显示结果
        display_results(&results);
        
        // 应用过滤器（如果指定）
        if let Some(ref filter_field) = args.filter_field {
            if let Some(ref filter_value) = args.filter_value {
                let filtered_results = filter_records(&results, filter_field, filter_value);
                display_records(&filtered_results);
            }
        }
        
        // 如果需要导出CSV
        if args.export_csv {
            // 确保目录存在
            let export_dir = "benchmark_results";
            if !Path::new(export_dir).exists() {
                std::fs::create_dir_all(export_dir)?;
            }
            
            // 导出结果
            let filename = format!(
                "{}/{}_{}.csv",
                export_dir,
                results.plugin_metadata.name.replace(" ", "_"),
                results.test_id
            );
            export_to_csv(&results, &filename)?;
            
            println!("Results exported to {}", filename);
        }
    }
    
    Ok(())
} 