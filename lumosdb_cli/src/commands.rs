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
        let input = input.trim();
        
        // 空命令
        if input.is_empty() {
            return Ok(CommandType::Query(input.to_string()));
        }
        
        // 以\开头的元命令
        if input.starts_with('\\') {
            let parts: Vec<&str> = input[1..].trim().splitn(2, ' ').collect();
            let cmd = parts[0].to_lowercase();
            let args = parts.get(1).map(|s| s.trim()).unwrap_or("");
            
            // 检查命令别名
            let cmd = if let Some(alias) = self.aliases.get(&cmd) {
                alias.clone()
            } else {
                cmd
            };
            
            // 解析元命令
            match cmd.as_str() {
                "h" | "help" => Ok(CommandType::Help),
                "c" | "connect" => Ok(CommandType::ConnectionInfo),
                "l" | "list" => Ok(CommandType::ListTables),
                "d" | "describe" => {
                    if args.is_empty() {
                        Err(anyhow!("需要表名参数"))
                    } else {
                        Ok(CommandType::DescribeTable(args.to_string()))
                    }
                },
                "e" | "export" => {
                    let export_parts: Vec<&str> = args.splitn(2, ' ').collect();
                    if export_parts.len() < 2 {
                        Err(anyhow!("导出命令需要格式和文件路径，例如: \\export csv /path/to/file.csv"))
                    } else {
                        Ok(CommandType::Export {
                            format: export_parts[0].to_string(),
                            path: export_parts[1].to_string(),
                        })
                    }
                },
                "set" => {
                    let set_parts: Vec<&str> = args.splitn(2, ' ').collect();
                    if set_parts.len() < 2 {
                        Err(anyhow!("设置变量需要键和值，例如: \\set format json"))
                    } else {
                        Ok(CommandType::Set {
                            key: set_parts[0].to_string(),
                            value: set_parts[1].to_string(),
                        })
                    }
                },
                "source" | "i" | "include" => {
                    if args.is_empty() {
                        Err(anyhow!("需要文件路径参数"))
                    } else {
                        Ok(CommandType::Source(args.to_string()))
                    }
                },
                "q" | "quit" | "exit" => Ok(CommandType::Exit),
                "edit" | "ed" => Ok(CommandType::Edit(if args.is_empty() { None } else { Some(args.to_string()) })),
                "history" => Ok(CommandType::History),
                "f" | "format" => {
                    if args.is_empty() {
                        Err(anyhow!("需要指定输出格式，例如: \\format json"))
                    } else {
                        Ok(CommandType::Format(args.to_string()))
                    }
                },
                "status" | "stat" => Ok(CommandType::Status),
                "clear" | "cls" => Ok(CommandType::Clear),
                _ => Err(anyhow!("未知命令: \\{}", cmd)),
            }
        } else {
            // SQL查询命令
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
} 