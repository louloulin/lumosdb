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
    pub fn parse_command(&self, line: &str) -> Result<CommandType> {
        let parts: Vec<&str> = line[1..].split_whitespace().collect();
        if parts.is_empty() {
            return Err(anyhow!("空命令"));
        }

        match parts[0].to_lowercase().as_str() {
            "h" | "help" => Ok(CommandType::Help),
            "c" | "connect" => {
                if parts.len() < 2 {
                    return Err(anyhow!("需要提供连接字符串"));
                }
                Ok(CommandType::Query(format!("CONNECT {}", parts[1])))
            },
            "l" | "list" => Ok(CommandType::ListTables),
            "d" | "describe" => {
                if parts.len() < 2 {
                    return Err(anyhow!("需要提供表名"));
                }
                Ok(CommandType::DescribeTable(parts[1].to_string()))
            },
            "e" | "export" => {
                if parts.len() < 3 {
                    return Err(anyhow!("需要提供格式和文件路径"));
                }
                Ok(CommandType::Export {
                    format: parts[1].to_string(),
                    path: parts[2].to_string(),
                })
            },
            "set" => {
                if parts.len() < 3 {
                    return Err(anyhow!("需要提供键和值"));
                }
                Ok(CommandType::Set {
                    key: parts[1].to_string(),
                    value: parts[2].to_string(),
                })
            },
            "source" | "i" => {
                if parts.len() < 2 {
                    return Err(anyhow!("需要提供文件路径"));
                }
                Ok(CommandType::Source(parts[1].to_string()))
            },
            "q" | "quit" | "exit" => Ok(CommandType::Exit),
            "edit" | "ed" => {
                let query = if parts.len() > 1 {
                    Some(parts[1..].join(" "))
                } else {
                    None
                };
                Ok(CommandType::Edit(query))
            },
            "history" => Ok(CommandType::History),
            "f" | "format" => {
                if parts.len() < 2 {
                    return Err(anyhow!("需要提供格式"));
                }
                Ok(CommandType::Format(parts[1].to_string()))
            },
            "status" | "stat" => Ok(CommandType::Status),
            "clear" | "cls" => Ok(CommandType::Clear),
            "sync" => {
                if parts.len() < 3 {
                    return Err(anyhow!("需要提供源和目标连接"));
                }
                let mut tables = None;
                let mut since = None;
                let mut sync_mode = None;
                let mut timestamp_fields = None;

                let mut i = 3;
                while i < parts.len() {
                    match parts[i] {
                        "--tables" => {
                            if i + 1 < parts.len() {
                                tables = Some(parts[i + 1].split(',').map(|s| s.to_string()).collect());
                                i += 2;
                                continue;
                            }
                        },
                        "--since" => {
                            if i + 1 < parts.len() {
                                since = Some(parts[i + 1].to_string());
                                i += 2;
                                continue;
                            }
                        },
                        "--mode" => {
                            if i + 1 < parts.len() {
                                sync_mode = Some(parts[i + 1].to_string());
                                i += 2;
                                continue;
                            }
                        },
                        "--timestamp-fields" => {
                            if i + 1 < parts.len() {
                                timestamp_fields = Some(parts[i + 1].split(',').map(|s| s.to_string()).collect());
                                i += 2;
                                continue;
                            }
                        },
                        _ => {}
                    }
                    i += 1;
                }

                Ok(CommandType::Sync {
                    source: parts[1].to_string(),
                    target: parts[2].to_string(),
                    tables,
                    since,
                    sync_mode,
                    timestamp_fields,
                })
            },
            "create-sync" => {
                if parts.len() < 4 {
                    return Err(anyhow!("需要提供名称、源连接和目标连接"));
                }
                let mut tables = None;
                let mut interval = None;
                let mut sync_mode = None;
                let mut timestamp_fields = None;

                let mut i = 4;
                while i < parts.len() {
                    match parts[i] {
                        "--tables" => {
                            if i + 1 < parts.len() {
                                tables = Some(parts[i + 1].split(',').map(|s| s.to_string()).collect());
                                i += 2;
                                continue;
                            }
                        },
                        "--interval" => {
                            if i + 1 < parts.len() {
                                interval = Some(parts[i + 1].parse()?);
                                i += 2;
                                continue;
                            }
                        },
                        "--mode" => {
                            if i + 1 < parts.len() {
                                sync_mode = Some(parts[i + 1].to_string());
                                i += 2;
                                continue;
                            }
                        },
                        "--timestamp-fields" => {
                            if i + 1 < parts.len() {
                                timestamp_fields = Some(parts[i + 1].split(',').map(|s| s.to_string()).collect());
                                i += 2;
                                continue;
                            }
                        },
                        _ => {}
                    }
                    i += 1;
                }

                Ok(CommandType::CreateSync {
                    name: parts[1].to_string(),
                    source: parts[2].to_string(),
                    target: parts[3].to_string(),
                    tables,
                    interval,
                    sync_mode,
                    timestamp_fields,
                })
            },
            "list-syncs" => Ok(CommandType::ListSyncs),
            "delete-sync" => {
                if parts.len() < 2 {
                    return Err(anyhow!("需要提供同步配置名称"));
                }
                Ok(CommandType::DeleteSync(parts[1].to_string()))
            },
            "benchmark" | "bench" => {
                if parts.len() < 4 {
                    return Err(anyhow!("需要提供数据库类型、操作类型和记录数"));
                }
                let mut batch_size = None;
                let mut concurrency = None;
                let mut output = None;

                let mut i = 4;
                while i < parts.len() {
                    match parts[i] {
                        "--batch-size" => {
                            if i + 1 < parts.len() {
                                batch_size = Some(parts[i + 1].parse()?);
                                i += 2;
                                continue;
                            }
                        },
                        "--concurrency" => {
                            if i + 1 < parts.len() {
                                concurrency = Some(parts[i + 1].parse()?);
                                i += 2;
                                continue;
                            }
                        },
                        "--output" => {
                            if i + 1 < parts.len() {
                                output = Some(parts[i + 1].to_string());
                                i += 2;
                                continue;
                            }
                        },
                        _ => {}
                    }
                    i += 1;
                }

                Ok(CommandType::Benchmark {
                    db_type: parts[1].to_string(),
                    operation: parts[2].to_string(),
                    records: parts[3].parse()?,
                    batch_size,
                    concurrency,
                    output,
                })
            },
            _ => Err(anyhow!("未知命令: {}", parts[0])),
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