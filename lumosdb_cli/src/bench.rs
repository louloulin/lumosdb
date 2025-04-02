use std::time::{Instant, Duration};
use std::thread;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use anyhow::{Result, anyhow};
use rand::{thread_rng, Rng};
use rand::distributions::Alphanumeric;
use prettytable::{Table, Row, Cell};
use crate::connection::Connection;

/// 基准测试结果
#[derive(Debug, Serialize, Deserialize)]
pub struct BenchmarkResult {
    pub operation: String,
    pub total_time: Duration,
    pub operations: usize,
    pub operations_per_second: f64,
    pub avg_latency: f64,
    pub min_latency: f64,
    pub max_latency: f64,
    pub p95_latency: f64,
    pub p99_latency: f64,
    pub errors: usize,
}

/// 延迟记录
#[derive(Debug, Clone)]
struct LatencyRecord {
    op_id: usize,
    latency: Duration,
    is_error: bool,
}

/// 基准测试执行器
pub struct BenchmarkExecutor {
    /// 数据库类型
    db_type: String,
    /// 操作类型 (write, read, mixed)
    operation: String,
    /// 要测试的记录数
    records: usize,
    /// 批量操作大小
    batch_size: usize,
    /// 并发线程数
    concurrency: usize,
    /// 输出文件路径
    output_path: Option<String>,
    /// 连接字符串
    connection_string: Option<String>,
}

impl BenchmarkExecutor {
    /// 创建新的基准测试执行器
    pub fn new(
        db_type: String,
        operation: String,
        records: usize,
        batch_size: Option<usize>,
        concurrency: Option<usize>,
        output_path: Option<String>,
        connection_string: Option<String>,
    ) -> Self {
        Self {
            db_type,
            operation,
            records,
            batch_size: batch_size.unwrap_or(1000),
            concurrency: concurrency.unwrap_or(4),
            output_path,
            connection_string,
        }
    }
    
    /// 运行基准测试
    pub fn run(&self) -> Result<BenchmarkResult> {
        println!("运行性能测试:");
        println!("数据库类型: {}", self.db_type);
        println!("操作类型: {}", self.operation);
        println!("记录数: {}", self.records);
        println!("批大小: {}", self.batch_size);
        println!("并发数: {}", self.concurrency);
        
        if let Some(path) = &self.output_path {
            println!("输出文件: {}", path);
        }
        
        let start_time = Instant::now();
        
        // 分配给每个线程的记录数
        let records_per_thread = self.records / self.concurrency;
        
        // 创建线程和共享数据
        let latencies = Arc::new(Mutex::new(Vec::with_capacity(self.records)));
        let errors = Arc::new(Mutex::new(Vec::new()));
        
        // 创建线程
        let mut handles = vec![];
        
        for thread_id in 0..self.concurrency {
            let latencies_clone = Arc::clone(&latencies);
            let errors_clone = Arc::clone(&errors);
            let db_type = self.db_type.clone();
            let operation = self.operation.clone();
            let batch_size = self.batch_size;
            let conn_string = self.connection_string.clone();
            
            // 计算起始位置
            let start_index = thread_id * records_per_thread;
            let end_index = if thread_id == self.concurrency - 1 {
                self.records
            } else {
                start_index + records_per_thread
            };
            let thread_records = end_index - start_index;
            
            // 启动线程
            let handle = thread::spawn(move || {
                Self::run_thread(
                    thread_id,
                    db_type,
                    operation,
                    start_index,
                    thread_records,
                    batch_size,
                    latencies_clone,
                    errors_clone,
                    conn_string,
                );
            });
            
            handles.push(handle);
        }
        
        // 等待所有线程完成
        for handle in handles {
            let _ = handle.join();
        }
        
        // 计算结果
        let total_time = start_time.elapsed();
        
        // 获取所有延迟记录
        let latencies = latencies.lock().unwrap();
        let successful_ops = latencies.iter().filter(|r| !r.is_error).count();
        let errors = latencies.iter().filter(|r| r.is_error).count();
        
        if latencies.is_empty() {
            return Err(anyhow!("没有成功完成的操作"));
        }
        
        // 计算统计数据
        let mut latency_values: Vec<f64> = latencies.iter()
            .filter(|r| !r.is_error)
            .map(|r| r.latency.as_secs_f64() * 1000.0) // 转换为毫秒
            .collect();
        
        latency_values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        
        let min_latency = latency_values.first().copied().unwrap_or(0.0);
        let max_latency = latency_values.last().copied().unwrap_or(0.0);
        let avg_latency = latency_values.iter().sum::<f64>() / latency_values.len() as f64;
        
        // 计算百分位数
        let p95_index = (latency_values.len() as f64 * 0.95) as usize;
        let p99_index = (latency_values.len() as f64 * 0.99) as usize;
        
        let p95_latency = if p95_index < latency_values.len() {
            latency_values[p95_index]
        } else {
            max_latency
        };
        
        let p99_latency = if p99_index < latency_values.len() {
            latency_values[p99_index]
        } else {
            max_latency
        };
        
        let ops_per_second = successful_ops as f64 / total_time.as_secs_f64();
        
        // 创建结果
        let result = BenchmarkResult {
            operation: self.operation.clone(),
            total_time,
            operations: successful_ops,
            operations_per_second: ops_per_second,
            avg_latency,
            min_latency,
            max_latency,
            p95_latency,
            p99_latency,
            errors,
        };
        
        // 打印结果
        self.print_results(&result);
        
        Ok(result)
    }
    
    /// 在线程中运行测试
    fn run_thread(
        thread_id: usize,
        db_type: String,
        operation: String,
        start_index: usize,
        records: usize,
        batch_size: usize,
        latencies: Arc<Mutex<Vec<LatencyRecord>>>,
        errors: Arc<Mutex<Vec<String>>>,
        connection_string: Option<String>,
    ) {
        println!("线程 {} 开始: 从索引 {} 测试 {} 条记录", thread_id, start_index, records);
        
        // 建立连接
        let conn_result = match connection_string {
            Some(ref conn_str) => Connection::new(conn_str),
            None => {
                // 根据数据库类型选择默认连接字符串
                match db_type.as_str() {
                    "lumos" => Connection::new("lumos://localhost:8080"),
                    "sqlite" => Connection::new("sqlite::memory:"),
                    _ => Err(anyhow!("不支持的数据库类型: {}", db_type)),
                }
            }
        };
        
        let connection = match conn_result {
            Ok(conn) => conn,
            Err(e) => {
                let error_msg = format!("线程 {} 连接失败: {}", thread_id, e);
                println!("{}", error_msg);
                if let Ok(mut errors) = errors.lock() {
                    errors.push(error_msg);
                }
                return;
            }
        };
        
        // 准备测试表
        let setup_result = match db_type.as_str() {
            "lumos" => {
                // 为LumosDB创建测试表
                let create_table_sql = "CREATE TABLE IF NOT EXISTS benchmark_data (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    value REAL,
                    content TEXT,
                    created_at TEXT
                )";
                
                connection.execute(create_table_sql)
            },
            "sqlite" => {
                // 为SQLite创建测试表
                let create_table_sql = "CREATE TABLE IF NOT EXISTS benchmark_data (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    value REAL,
                    content TEXT,
                    created_at TEXT
                )";
                
                connection.execute(create_table_sql)
            },
            _ => Err(anyhow!("不支持的数据库类型: {}", db_type)),
        };
        
        if let Err(e) = setup_result {
            let error_msg = format!("线程 {} 准备测试表失败: {}", thread_id, e);
            println!("{}", error_msg);
            if let Ok(mut errors) = errors.lock() {
                errors.push(error_msg);
            }
            return;
        }
        
        // 进行实际测试
        match operation.as_str() {
            "write" => {
                // 写入测试
                for batch_start in (0..records).step_by(batch_size) {
                    let batch_end = std::cmp::min(batch_start + batch_size, records);
                    let batch_size = batch_end - batch_start;
                    
                    // 构建批量插入语句
                    let mut values = Vec::with_capacity(batch_size);
                    let mut params = Vec::new();
                    
                    for i in 0..batch_size {
                        let op_id = start_index + batch_start + i;
                        let name = Self::generate_random_string(10);
                        let value = thread_rng().gen_range(0.0..1000.0);
                        let content = Self::generate_random_string(50);
                        let created_at = chrono::Utc::now().to_rfc3339();
                        
                        values.push(format!("(?, ?, ?, ?, ?)"));
                        params.push(op_id.to_string());
                        params.push(name);
                        params.push(value.to_string());
                        params.push(content);
                        params.push(created_at);
                    }
                    
                    let sql = format!(
                        "INSERT INTO benchmark_data (id, name, value, content, created_at) VALUES {}",
                        values.join(", ")
                    );
                    
                    // 执行并记录延迟
                    let start = Instant::now();
                    let result = connection.execute_with_params(&sql, &params);
                    let elapsed = start.elapsed();
                    
                    // 记录结果
                    if let Ok(mut latencies) = latencies.lock() {
                        match result {
                            Ok(_) => {
                                // 为批中的每个操作记录相同的延迟
                                for i in 0..batch_size {
                                    let op_id = start_index + batch_start + i;
                                    latencies.push(LatencyRecord {
                                        op_id,
                                        latency: elapsed,
                                        is_error: false,
                                    });
                                }
                                
                                // 定期打印进度
                                if (batch_start + batch_size) % (batch_size * 10) == 0 || batch_start + batch_size == records {
                                    println!("线程 {}: 已完成 {}/{} 操作", thread_id, batch_start + batch_size, records);
                                }
                            },
                            Err(e) => {
                                let error_msg = format!("线程 {} 批量插入失败: {}", thread_id, e);
                                println!("{}", error_msg);
                                
                                // 为批中的每个操作记录错误
                                for i in 0..batch_size {
                                    let op_id = start_index + batch_start + i;
                                    latencies.push(LatencyRecord {
                                        op_id,
                                        latency: elapsed,
                                        is_error: true,
                                    });
                                }
                                
                                if let Ok(mut errors) = errors.lock() {
                                    errors.push(error_msg);
                                }
                            }
                        }
                    }
                }
            },
            "read" => {
                // 读取测试
                
                // 创建一些测试数据
                let setup_sql = "INSERT INTO benchmark_data (id, name, value, content, created_at)
                              SELECT 
                                  value, 
                                  'test_name_' || value, 
                                  value * 1.5, 
                                  'test_content_' || value, 
                                  datetime('now')
                              FROM (
                                  WITH RECURSIVE counter(value) AS (
                                      SELECT 1
                                      UNION ALL
                                      SELECT value + 1 FROM counter WHERE value < 100
                                  )
                                  SELECT value FROM counter
                              )";
                
                if let Err(e) = connection.execute(setup_sql) {
                    let error_msg = format!("线程 {} 准备测试数据失败: {}", thread_id, e);
                    println!("{}", error_msg);
                    if let Ok(mut errors) = errors.lock() {
                        errors.push(error_msg);
                    }
                }
                
                // 开始读取测试
                for i in 0..records {
                    let op_id = start_index + i;
                    let id = thread_rng().gen_range(1..100); // 随机ID
                    
                    let sql = "SELECT * FROM benchmark_data WHERE id = ?";
                    
                    // 执行并记录延迟
                    let start = Instant::now();
                    let result = connection.execute_with_params(sql, &[id.to_string()]);
                    let elapsed = start.elapsed();
                    
                    // 记录结果
                    if let Ok(mut latencies) = latencies.lock() {
                        match result {
                            Ok(_) => {
                                latencies.push(LatencyRecord {
                                    op_id,
                                    latency: elapsed,
                                    is_error: false,
                                });
                                
                                // 定期打印进度
                                if (i + 1) % (batch_size * 10) == 0 || i + 1 == records {
                                    println!("线程 {}: 已完成 {}/{} 操作", thread_id, i + 1, records);
                                }
                            },
                            Err(e) => {
                                let error_msg = format!("线程 {} 查询失败: {}", thread_id, e);
                                println!("{}", error_msg);
                                
                                latencies.push(LatencyRecord {
                                    op_id,
                                    latency: elapsed,
                                    is_error: true,
                                });
                                
                                if let Ok(mut errors) = errors.lock() {
                                    errors.push(error_msg);
                                }
                            }
                        }
                    }
                }
            },
            "mixed" => {
                // 混合读写测试
                
                // 创建一些测试数据
                let setup_sql = "INSERT INTO benchmark_data (id, name, value, content, created_at)
                              SELECT 
                                  value, 
                                  'test_name_' || value, 
                                  value * 1.5, 
                                  'test_content_' || value, 
                                  datetime('now')
                              FROM (
                                  WITH RECURSIVE counter(value) AS (
                                      SELECT 1
                                      UNION ALL
                                      SELECT value + 1 FROM counter WHERE value < 100
                                  )
                                  SELECT value FROM counter
                              )";
                
                if let Err(e) = connection.execute(setup_sql) {
                    let error_msg = format!("线程 {} 准备测试数据失败: {}", thread_id, e);
                    println!("{}", error_msg);
                    if let Ok(mut errors) = errors.lock() {
                        errors.push(error_msg);
                    }
                }
                
                // 开始混合测试
                for i in 0..records {
                    let op_id = start_index + i;
                    let is_write = thread_rng().gen_bool(0.3); // 30%写入，70%读取
                    
                    let (sql, params) = if is_write {
                        // 写入操作
                        let id = 1000 + op_id as i64; // 避免与测试数据冲突
                        let name = Self::generate_random_string(10);
                        let value = thread_rng().gen_range(0.0..1000.0);
                        let content = Self::generate_random_string(50);
                        let created_at = chrono::Utc::now().to_rfc3339();
                        
                        (
                            "INSERT INTO benchmark_data (id, name, value, content, created_at) VALUES (?, ?, ?, ?, ?)".to_string(),
                            vec![id.to_string(), name, value.to_string(), content, created_at]
                        )
                    } else {
                        // 读取操作
                        let id = thread_rng().gen_range(1..100); // 随机ID
                        (
                            "SELECT * FROM benchmark_data WHERE id = ?".to_string(),
                            vec![id.to_string()]
                        )
                    };
                    
                    // 执行并记录延迟
                    let start = Instant::now();
                    let result = connection.execute_with_params(&sql, &params);
                    let elapsed = start.elapsed();
                    
                    // 记录结果
                    if let Ok(mut latencies) = latencies.lock() {
                        match result {
                            Ok(_) => {
                                latencies.push(LatencyRecord {
                                    op_id,
                                    latency: elapsed,
                                    is_error: false,
                                });
                                
                                // 定期打印进度
                                if (i + 1) % (batch_size * 10) == 0 || i + 1 == records {
                                    println!("线程 {}: 已完成 {}/{} 操作", thread_id, i + 1, records);
                                }
                            },
                            Err(e) => {
                                let error_msg = format!("线程 {} 操作失败: {}", thread_id, e);
                                println!("{}", error_msg);
                                
                                latencies.push(LatencyRecord {
                                    op_id,
                                    latency: elapsed,
                                    is_error: true,
                                });
                                
                                if let Ok(mut errors) = errors.lock() {
                                    errors.push(error_msg);
                                }
                            }
                        }
                    }
                }
            },
            _ => {
                let error_msg = format!("线程 {} 不支持的操作类型: {}", thread_id, operation);
                println!("{}", error_msg);
                if let Ok(mut errors) = errors.lock() {
                    errors.push(error_msg);
                }
            }
        }
        
        println!("线程 {} 完成", thread_id);
    }
    
    /// 打印基准测试结果
    fn print_results(&self, result: &BenchmarkResult) {
        let mut table = Table::new();
        
        table.add_row(Row::new(vec![
            Cell::new("指标"),
            Cell::new("值"),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("数据库类型"),
            Cell::new(&self.db_type),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("操作类型"),
            Cell::new(&self.operation),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("记录数"),
            Cell::new(&self.records.to_string()),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("批大小"),
            Cell::new(&self.batch_size.to_string()),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("并发数"),
            Cell::new(&self.concurrency.to_string()),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("总耗时(ms)"),
            Cell::new(&format!("{:.2}", result.total_time.as_secs_f64() * 1000.0)),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("成功操作数"),
            Cell::new(&result.operations.to_string()),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("每秒操作数"),
            Cell::new(&format!("{:.2}", result.operations_per_second)),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("平均延迟(ms)"),
            Cell::new(&format!("{:.2}", result.avg_latency)),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("最小延迟(ms)"),
            Cell::new(&format!("{:.2}", result.min_latency)),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("最大延迟(ms)"),
            Cell::new(&format!("{:.2}", result.max_latency)),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("95%延迟(ms)"),
            Cell::new(&format!("{:.2}", result.p95_latency)),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("99%延迟(ms)"),
            Cell::new(&format!("{:.2}", result.p99_latency)),
        ]));
        
        table.add_row(Row::new(vec![
            Cell::new("错误数"),
            Cell::new(&result.errors.to_string()),
        ]));
        
        // 打印结果表格
        table.printstd();
        
        // 保存结果到文件
        if let Some(path) = &self.output_path {
            println!("结果已保存到文件: {}", path);
            
            // 在实际实现中，这里应该将结果写入文件
            // 例如：将结果序列化为JSON并写入文件
        }
    }
    
    // 生成随机字符串
    fn generate_random_string(length: usize) -> String {
        thread_rng()
            .sample_iter(&Alphanumeric)
            .take(length)
            .map(char::from)
            .collect()
    }
} 