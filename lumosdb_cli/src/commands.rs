use anyhow::{anyhow, Context, Result};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// 内置命令类型
#[derive(Debug, Clone)]
pub enum CommandType {
    /// 帮助命令
    Help,
    /// 显示连接信息
    ConnectionInfo,
    /// 列出表
    ListTables,
    /// 查看表结构
    DescribeTable(String),
    /// 导出结果
    Export { format: String, path: String },
    /// 设置变量
    Set { key: String, value: String },
    /// 执行SQL文件
    Source(String),
    /// 退出命令
    Exit,
    /// SQL查询命令
    Query(String),
    /// 编辑查询
    Edit(Option<String>),
    /// 查看历史命令
    History,
    /// 切换输出格式
    Format(String),
    /// 显示当前数据库状态
    Status,
    /// 清屏
    Clear,
    /// 同步命令
    Sync { 
        source: String, 
        target: String, 
        tables: Option<Vec<String>>,
        since: Option<String>,
        sync_mode: Option<String>,
        timestamp_fields: Option<Vec<String>>
    },
    /// 创建同步配置
    CreateSync { 
        name: String, 
        source: String, 
        target: String, 
        tables: Option<Vec<String>>,
        interval: Option<u64>,
        sync_mode: Option<String>,
        timestamp_fields: Option<Vec<String>>
    },
    /// 列出同步配置
    ListSyncs,
    /// 删除同步配置
    DeleteSync(String),
    /// 性能测试命令
    Benchmark {
        /// 数据库类型 (sqlite, duckdb)
        db_type: String,
        /// 操作类型 (write, read, mixed)
        operation: String,
        /// 记录数量
        records: usize,
        /// 每批次记录数
        batch_size: Option<usize>,
        /// 并发数
        concurrency: Option<usize>,
        /// 输出结果文件路径
        output: Option<String>,
    },
}

/// 命令处理器
pub struct CommandProcessor {
    /// 命令别名映射
    aliases: HashMap<String, String>,
    /// 环境变量
    variables: HashMap<String, String>,
}

impl CommandProcessor {
    /// 创建新实例
    pub fn new(aliases: HashMap<String, String>) -> Self {
        Self {
            aliases,
            variables: HashMap::new(),
        }
    }
    
    /// 解析命令
    pub fn parse_command(&self, input: &str) -> Result<CommandType> {
        // 替换变量
        let input = self.replace_vars(input);
        
        // 首先检查是否是以反斜杠开头的命令
        if input.starts_with('\\') {
            let parts: Vec<&str> = input.splitn(2, ' ').collect();
            let cmd = parts[0];
            let args = parts.get(1).map(|s| s.trim()).unwrap_or("");
            
            match cmd {
                "\\h" | "\\help" => Ok(CommandType::Help),
                "\\c" | "\\connect" => {
                    if args.is_empty() {
                        Ok(CommandType::ConnectionInfo)
                    } else {
                        // 这种情况下，这是连接到数据库的命令
                        // 但在当前实现中，我们通过REPL处理，而不是CommandType
                        Ok(CommandType::Query(format!("CONNECT {}", args)))
                    }
                },
                "\\l" | "\\list" => Ok(CommandType::ListTables),
                "\\d" | "\\describe" => {
                    if args.is_empty() {
                        return Err(anyhow!("缺少表名"));
                    }
                    Ok(CommandType::DescribeTable(args.to_string()))
                },
                "\\e" | "\\export" => {
                    let parts: Vec<&str> = args.splitn(2, ' ').collect();
                    if parts.len() < 2 {
                        return Err(anyhow!("用法: \\export [format] [filename]"));
                    }
                    
                    let format = parts[0].to_string();
                    let path = parts[1].to_string();
                    
                    Ok(CommandType::Export { format, path })
                },
                "\\set" => {
                    let parts: Vec<&str> = args.splitn(2, ' ').collect();
                    if parts.len() < 2 {
                        return Err(anyhow!("用法: \\set [key] [value]"));
                    }
                    
                    let key = parts[0].to_string();
                    let value = parts[1].to_string();
                    
                    Ok(CommandType::Set { key, value })
                },
                "\\source" | "\\i" => {
                    if args.is_empty() {
                        return Err(anyhow!("缺少文件路径"));
                    }
                    Ok(CommandType::Source(args.to_string()))
                },
                "\\q" | "\\quit" | "\\exit" => Ok(CommandType::Exit),
                "\\edit" | "\\ed" => {
                    let query = if args.is_empty() {
                        None
                    } else {
                        Some(args.to_string())
                    };
                    
                    Ok(CommandType::Edit(query))
                },
                "\\history" => Ok(CommandType::History),
                "\\f" | "\\format" => {
                    if args.is_empty() {
                        return Err(anyhow!("缺少格式参数"));
                    }
                    Ok(CommandType::Format(args.to_string()))
                },
                "\\status" | "\\stat" => Ok(CommandType::Status),
                "\\clear" | "\\cls" => Ok(CommandType::Clear),
                "\\sync" => {
                    let parts: Vec<&str> = args.split_whitespace().collect();
                    if parts.len() < 2 {
                        return Err(anyhow!("用法: \\sync [source] [target] [--tables table1,table2] [--since timestamp] [--mode full|incremental|mirror] [--timestamp-fields field1,field2]"));
                    }
                    
                    let source = parts[0].to_string();
                    let target = parts[1].to_string();
                    let mut tables = None;
                    let mut since = None;
                    let mut sync_mode = None;
                    let mut timestamp_fields = None;
                    
                    let mut i = 2;
                    while i < parts.len() {
                        match parts[i] {
                            "--tables" => {
                                if i + 1 < parts.len() {
                                    tables = Some(parts[i + 1].split(',').map(|s| s.to_string()).collect());
                                    i += 2;
                                } else {
                                    return Err(anyhow!("--tables 参数后缺少表名"));
                                }
                            },
                            "--since" => {
                                if i + 1 < parts.len() {
                                    since = Some(parts[i + 1].to_string());
                                    i += 2;
                                } else {
                                    return Err(anyhow!("--since 参数后缺少时间戳"));
                                }
                            },
                            "--mode" => {
                                if i + 1 < parts.len() {
                                    let mode = parts[i + 1].to_lowercase();
                                    if mode == "full" || mode == "incremental" || mode == "mirror" {
                                        sync_mode = Some(mode);
                                        i += 2;
                                    } else {
                                        return Err(anyhow!("无效的同步模式，支持的值: full, incremental, mirror"));
                                    }
                                } else {
                                    return Err(anyhow!("--mode 参数后缺少同步模式"));
                                }
                            },
                            "--timestamp-fields" => {
                                if i + 1 < parts.len() {
                                    timestamp_fields = Some(parts[i + 1].split(',').map(|s| s.to_string()).collect());
                                    i += 2;
                                } else {
                                    return Err(anyhow!("--timestamp-fields 参数后缺少字段列表"));
                                }
                            },
                            _ => {
                                return Err(anyhow!("未知参数: {}", parts[i]));
                            }
                        }
                    }
                    
                    Ok(CommandType::Sync { 
                        source, 
                        target, 
                        tables, 
                        since, 
                        sync_mode, 
                        timestamp_fields 
                    })
                },
                "\\benchmark" | "\\bench" => {
                    let parts: Vec<&str> = args.split_whitespace().collect();
                    if parts.len() < 3 {
                        return Err(anyhow!("用法: \\benchmark [sqlite|duckdb|lumos] [write|read|mixed] [记录数] [--batch-size 批大小] [--concurrency 并发数] [--output 输出文件路径]"));
                    }
                    
                    let db_type = parts[0].to_string();
                    // 检查数据库类型
                    if db_type != "sqlite" && db_type != "duckdb" && db_type != "lumos" {
                        return Err(anyhow!("不支持的数据库类型: {}，支持的类型有: sqlite, duckdb, lumos", db_type));
                    }
                    
                    let operation = parts[1].to_string();
                    // 检查操作类型
                    if operation != "write" && operation != "read" && operation != "mixed" {
                        return Err(anyhow!("不支持的操作类型: {}，支持的类型有: write, read, mixed", operation));
                    }
                    
                    // 解析记录数
                    let records = match parts[2].parse::<usize>() {
                        Ok(num) => num,
                        Err(_) => return Err(anyhow!("记录数必须是一个正整数: {}", parts[2])),
                    };
                    
                    // 解析可选参数
                    let mut batch_size = None;
                    let mut concurrency = None;
                    let mut output = None;
                    
                    let mut i = 3;
                    while i < parts.len() {
                        match parts[i] {
                            "--batch-size" => {
                                if i + 1 < parts.len() {
                                    match parts[i + 1].parse::<usize>() {
                                        Ok(size) => {
                                            batch_size = Some(size);
                                            i += 2;
                                        },
                                        Err(_) => return Err(anyhow!("批大小必须是一个正整数: {}", parts[i + 1])),
                                    }
                                } else {
                                    return Err(anyhow!("--batch-size 参数后缺少值"));
                                }
                            },
                            "--concurrency" => {
                                if i + 1 < parts.len() {
                                    match parts[i + 1].parse::<usize>() {
                                        Ok(count) => {
                                            concurrency = Some(count);
                                            i += 2;
                                        },
                                        Err(_) => return Err(anyhow!("并发数必须是一个正整数: {}", parts[i + 1])),
                                    }
                                } else {
                                    return Err(anyhow!("--concurrency 参数后缺少值"));
                                }
                            },
                            "--output" => {
                                if i + 1 < parts.len() {
                                    output = Some(parts[i + 1].to_string());
                                    i += 2;
                                } else {
                                    return Err(anyhow!("--output 参数后缺少文件路径"));
                                }
                            },
                            _ => {
                                return Err(anyhow!("未知参数: {}", parts[i]));
                            }
                        }
                    }
                    
                    Ok(CommandType::Benchmark { 
                        db_type, 
                        operation, 
                        records, 
                        batch_size, 
                        concurrency, 
                        output 
                    })
                },
                "\\create-sync" => {
                    let parts: Vec<&str> = args.split_whitespace().collect();
                    if parts.len() < 3 {
                        return Err(anyhow!("用法: \\create-sync [name] [source] [target] [--tables table1,table2] [--interval seconds] [--mode full|incremental|mirror] [--timestamp-fields field1,field2]"));
                    }
                    
                    let name = parts[0].to_string();
                    let source = parts[1].to_string();
                    let target = parts[2].to_string();
                    let mut tables = None;
                    let mut interval = None;
                    let mut sync_mode = None;
                    let mut timestamp_fields = None;
                    
                    let mut i = 3;
                    while i < parts.len() {
                        match parts[i] {
                            "--tables" => {
                                if i + 1 < parts.len() {
                                    tables = Some(parts[i + 1].split(',').map(|s| s.to_string()).collect());
                                    i += 2;
                                } else {
                                    return Err(anyhow!("--tables 参数后缺少表名"));
                                }
                            },
                            "--interval" => {
                                if i + 1 < parts.len() {
                                    interval = Some(parts[i + 1].parse::<u64>().map_err(|_| anyhow!("无效的时间间隔"))?);
                                    i += 2;
                                } else {
                                    return Err(anyhow!("--interval 参数后缺少秒数"));
                                }
                            },
                            "--mode" => {
                                if i + 1 < parts.len() {
                                    let mode = parts[i + 1].to_lowercase();
                                    if mode == "full" || mode == "incremental" || mode == "mirror" {
                                        sync_mode = Some(mode);
                                        i += 2;
                                    } else {
                                        return Err(anyhow!("无效的同步模式，支持的值: full, incremental, mirror"));
                                    }
                                } else {
                                    return Err(anyhow!("--mode 参数后缺少同步模式"));
                                }
                            },
                            "--timestamp-fields" => {
                                if i + 1 < parts.len() {
                                    timestamp_fields = Some(parts[i + 1].split(',').map(|s| s.to_string()).collect());
                                    i += 2;
                                } else {
                                    return Err(anyhow!("--timestamp-fields 参数后缺少字段名"));
                                }
                            },
                            _ => {
                                i += 1;
                            }
                        }
                    }
                    
                    Ok(CommandType::CreateSync { 
                        name, 
                        source, 
                        target, 
                        tables, 
                        interval,
                        sync_mode,
                        timestamp_fields
                    })
                },
                "\\list-syncs" => Ok(CommandType::ListSyncs),
                "\\delete-sync" => {
                    if args.is_empty() {
                        return Err(anyhow!("缺少同步配置名称"));
                    }
                    Ok(CommandType::DeleteSync(args.to_string()))
                },
                _ => Err(anyhow!("未知命令: {}", cmd)),
            }
        } else {
            // 如果不是特殊命令，则作为普通SQL查询处理
            Ok(CommandType::Query(input.to_string()))
        }
    }
    
    /// 读取SQL文件
    pub fn read_sql_file(&self, path: &str) -> Result<String> {
        let path = Path::new(path);
        
        if !path.exists() {
            return Err(anyhow!("文件不存在: {}", path.display()));
        }
        
        fs::read_to_string(path)
            .with_context(|| format!("无法读取文件: {}", path.display()))
    }
    
    /// 获取环境变量值
    pub fn get_var(&self, key: &str) -> Option<&str> {
        self.variables.get(key).map(|s| s.as_str())
    }
    
    /// 设置环境变量
    pub fn set_var(&mut self, key: &str, value: &str) {
        self.variables.insert(key.to_string(), value.to_string());
    }
    
    /// 获取所有环境变量
    pub fn get_vars(&self) -> &HashMap<String, String> {
        &self.variables
    }

    /// 替换变量
    fn replace_vars(&self, input: &str) -> String {
        let mut output = String::new();
        let mut i = 0;
        let chars: Vec<char> = input.chars().collect();
        
        while i < chars.len() {
            if chars[i] == '\\' && i + 1 < chars.len() && chars[i + 1] == '\\' {
                output.push('\\');
                i += 2;
            } else if chars[i] == '\\' && i + 1 < chars.len() && chars[i + 1] == '$' {
                let mut j = i + 2;
                while j < chars.len() && chars[j] != '$' {
                    j += 1;
                }
                if j < chars.len() {
                    let var = &input[i + 2..j];
                    if let Some(value) = self.get_var(var) {
                        output.push_str(value);
                    }
                    i = j + 1;
                } else {
                    output.push_str("\\$");
                    i += 1;
                }
            } else {
                output.push(chars[i]);
                i += 1;
            }
        }
        
        output
    }
} 