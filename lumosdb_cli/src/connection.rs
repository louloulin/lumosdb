use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::time::Duration;
use std::collections::HashMap;
use reqwest::{blocking::Client, StatusCode};

/// 数据库类型
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DatabaseType {
    /// SQLite数据库
    SQLite,
    /// DuckDB数据库
    DuckDB,
    /// LumosDB服务器
    LumosServer,
}

impl fmt::Display for DatabaseType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DatabaseType::SQLite => write!(f, "SQLite"),
            DatabaseType::DuckDB => write!(f, "DuckDB"),
            DatabaseType::LumosServer => write!(f, "LumosDB"),
        }
    }
}

/// 连接信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    /// 数据库类型
    pub db_type: DatabaseType,
    /// 数据库路径或服务器URL
    pub path: String,
    /// 连接名称
    pub name: Option<String>,
    /// 连接超时(秒)
    pub timeout: Option<u64>,
    /// 连接参数
    pub params: std::collections::HashMap<String, String>,
    /// API密钥（用于服务器认证）
    pub api_key: Option<String>,
}

impl ConnectionInfo {
    /// 从连接字符串解析连接信息
    pub fn from_connection_string(conn_str: &str) -> Result<Self> {
        // 解析格式: 
        // - [sqlite|duckdb]://path/to/database?param1=value1&param2=value2
        // - lumos://hostname:port?param1=value1&param2=value2
        let parts: Vec<&str> = conn_str.splitn(2, "://").collect();
        if parts.len() != 2 {
            return Err(anyhow!("无效的连接字符串格式，应为: [sqlite|duckdb|lumos]://path/to/database 或 server:port"));
        }

        let db_type = match parts[0].to_lowercase().as_str() {
            "sqlite" => DatabaseType::SQLite,
            "duckdb" => DatabaseType::DuckDB,
            "lumos" => DatabaseType::LumosServer,
            _ => return Err(anyhow!("不支持的数据库类型: {}", parts[0])),
        };

        // 解析路径和参数
        let path_and_params: Vec<&str> = parts[1].splitn(2, "?").collect();
        let path = path_and_params[0].to_string();
        
        let mut params = std::collections::HashMap::new();
        let mut name = None;
        let mut timeout = None;
        let mut api_key = None;
        
        if path_and_params.len() > 1 {
            let param_str = path_and_params[1];
            for param_pair in param_str.split('&') {
                let kv: Vec<&str> = param_pair.splitn(2, "=").collect();
                if kv.len() == 2 {
                    match kv[0] {
                        "name" => name = Some(kv[1].to_string()),
                        "timeout" => {
                            timeout = kv[1].parse::<u64>().ok();
                        },
                        "api_key" => {
                            api_key = Some(kv[1].to_string());
                        },
                        _ => {
                            params.insert(kv[0].to_string(), kv[1].to_string());
                        }
                    }
                }
            }
        }

        Ok(ConnectionInfo {
            db_type,
            path,
            name,
            timeout,
            params,
            api_key,
        })
    }
    
    /// 生成连接字符串
    pub fn to_connection_string(&self) -> String {
        let db_type = match self.db_type {
            DatabaseType::SQLite => "sqlite",
            DatabaseType::DuckDB => "duckdb",
            DatabaseType::LumosServer => "lumos",
        };
        
        let mut conn_str = format!("{}://{}", db_type, self.path);
        
        // 添加参数
        let mut params = Vec::new();
        
        if let Some(name) = &self.name {
            params.push(format!("name={}", name));
        }
        
        if let Some(timeout) = &self.timeout {
            params.push(format!("timeout={}", timeout));
        }
        
        if let Some(api_key) = &self.api_key {
            params.push(format!("api_key={}", api_key));
        }
        
        for (key, value) in &self.params {
            params.push(format!("{}={}", key, value));
        }
        
        if !params.is_empty() {
            conn_str.push('?');
            conn_str.push_str(&params.join("&"));
        }
        
        conn_str
    }
}

/// 数据库元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseMetadata {
    /// 数据库类型
    pub db_type: DatabaseType,
    /// 数据库版本
    pub version: String,
    /// 数据库表列表
    pub tables: Vec<String>,
}

/// 查询结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    /// 列名
    pub columns: Vec<String>,
    /// 数据行
    pub rows: Vec<Vec<String>>,
    /// 执行时间
    pub execution_time: Duration,
    /// 影响的行数（用于非查询操作）
    pub affected_rows: usize,
}

/// 数据库连接
pub struct Connection {
    /// 连接信息
    pub info: ConnectionInfo,
    /// HTTP客户端（用于服务器连接）
    client: Option<Client>,
    /// 服务器基础URL（用于服务器连接）
    base_url: Option<String>,
}

impl Connection {
    /// 创建新连接
    pub fn new(conn_str: &str) -> Result<Self> {
        let info = ConnectionInfo::from_connection_string(conn_str)?;
        
        let (client, base_url) = match info.db_type {
            DatabaseType::LumosServer => {
                // 为LumosDB服务器创建HTTP客户端
                let client = Client::builder()
                    .timeout(info.timeout.map(Duration::from_secs).unwrap_or(Duration::from_secs(30)))
                    .build()?;
                
                // 构建服务器基础URL
                let mut url = format!("http://{}", info.path);
                if !url.ends_with('/') {
                    url.push('/');
                }
                
                (Some(client), Some(url))
            },
            _ => (None, None),
        };
        
        Ok(Self { 
            info,
            client,
            base_url
        })
    }
    
    /// 执行查询
    pub fn execute(&self, query: &str) -> Result<QueryResult> {
        match self.info.db_type {
            DatabaseType::LumosServer => {
                self.execute_on_server(query)
            },
            _ => {
                // 模拟本地数据库查询
                // 将来会实现本地SQLite和DuckDB支持
                self.execute_mock(query)
            }
        }
    }
    
    /// 在LumosDB服务器上执行查询
    fn execute_on_server(&self, query: &str) -> Result<QueryResult> {
        let client = self.client.as_ref()
            .ok_or_else(|| anyhow!("未初始化HTTP客户端"))?;
        let base_url = self.base_url.as_ref()
            .ok_or_else(|| anyhow!("未初始化服务器URL"))?;
        
        let start = std::time::Instant::now();
        
        // 构建API请求
        let url = format!("{}api/db/query", base_url);
        let mut request_builder = client.post(&url)
            .json(&serde_json::json!({
                "sql": query,
                "params": []
            }));
            
        // 如果有API密钥，添加到请求头
        if let Some(api_key) = &self.info.api_key {
            request_builder = request_builder.header("X-API-Key", api_key);
        }
        
        // 发送请求并获取响应
        let response = request_builder.send()?;
        
        // 计算执行时间
        let execution_time = start.elapsed();
        
        match response.status() {
            StatusCode::OK => {
                // 解析查询结果
                let json: serde_json::Value = response.json()?;
                
                if let Some(success) = json.get("success").and_then(|v| v.as_bool()) {
                    if success {
                        // 成功响应
                        if let Some(data) = json.get("data").and_then(|v| v.as_array()) {
                            // 提取列名
                            let mut columns = Vec::new();
                            if let Some(first_row) = data.first() {
                                if let Some(obj) = first_row.as_object() {
                                    columns = obj.keys().cloned().collect();
                                }
                            }
                            
                            // 提取数据行
                            let mut rows = Vec::new();
                            for row_obj in data {
                                if let Some(row_map) = row_obj.as_object() {
                                    let mut row = Vec::new();
                                    for column in &columns {
                                        let value = if let Some(val) = row_map.get(column) {
                                            if val.is_null() {
                                                "NULL".to_string()
                                            } else if val.is_string() {
                                                val.as_str().unwrap_or("").to_string()
                                            } else {
                                                val.to_string()
                                            }
                                        } else {
                                            "NULL".to_string()
                                        };
                                        
                                        row.push(value);
                                    }
                                    rows.push(row);
                                }
                            }
                            
                            return Ok(QueryResult {
                                columns,
                                rows: rows.clone(),
                                execution_time,
                                affected_rows: rows.len(),
                            });
                        }
                        
                        // 数据为空，可能是非查询操作
                        return Ok(QueryResult {
                            columns: Vec::new(),
                            rows: Vec::new(),
                            execution_time,
                            affected_rows: json.get("affected_rows")
                                .and_then(|v| v.as_u64())
                                .unwrap_or(0) as usize,
                        });
                    } else {
                        // 错误响应
                        let error_msg = json.get("error")
                            .and_then(|e| e.get("message"))
                            .and_then(|m| m.as_str())
                            .unwrap_or("Unknown error");
                            
                        return Err(anyhow!("Query failed: {}", error_msg));
                    }
                }
                
                Err(anyhow!("Invalid response format"))
            },
            status => {
                // 处理HTTP错误
                Err(anyhow!("HTTP error: {}", status))
            }
        }
    }
    
    /// 模拟查询执行（用于本地数据库）
    fn execute_mock(&self, query: &str) -> Result<QueryResult> {
        // 模拟查询执行
        log::debug!("执行查询: {}", query);
        
        // 简单模拟一些查询结果
        let mut result = QueryResult {
            columns: vec!["id".to_string(), "name".to_string(), "value".to_string()],
            rows: Vec::new(),
            execution_time: Duration::from_millis(100),
            affected_rows: 0,
        };
        
        if query.to_lowercase().contains("select") {
            result.rows = vec![
                vec!["1".to_string(), "item1".to_string(), "100".to_string()],
                vec!["2".to_string(), "item2".to_string(), "200".to_string()],
                vec!["3".to_string(), "item3".to_string(), "300".to_string()],
            ];
        } else if query.to_lowercase().contains("insert") || 
                  query.to_lowercase().contains("update") || 
                  query.to_lowercase().contains("delete") {
            result.affected_rows = 1;
        }
        
        Ok(result)
    }
    
    /// 获取元数据
    pub fn get_metadata(&self) -> Result<DatabaseMetadata> {
        match self.info.db_type {
            DatabaseType::LumosServer => {
                self.get_server_metadata()
            },
            _ => {
                // 模拟获取元数据
                Ok(DatabaseMetadata {
                    db_type: self.info.db_type.clone(),
                    version: match self.info.db_type {
                        DatabaseType::SQLite => "3.40.0",
                        DatabaseType::DuckDB => "0.8.0",
                        DatabaseType::LumosServer => "0.1.0",
                    }.to_string(),
                    tables: vec![
                        "users".to_string(),
                        "products".to_string(),
                        "orders".to_string(),
                    ],
                })
            }
        }
    }
    
    /// 获取服务器元数据
    fn get_server_metadata(&self) -> Result<DatabaseMetadata> {
        let client = self.client.as_ref()
            .ok_or_else(|| anyhow!("未初始化HTTP客户端"))?;
        let base_url = self.base_url.as_ref()
            .ok_or_else(|| anyhow!("未初始化服务器URL"))?;
        
        // 构建API请求
        let url = format!("{}api/db/metadata", base_url);
        let mut request_builder = client.get(&url);
        
        // 如果有API密钥，添加到请求头
        if let Some(api_key) = &self.info.api_key {
            request_builder = request_builder.header("X-API-Key", api_key);
        }
        
        // 发送请求并获取响应
        let response = request_builder.send()?;
        
        match response.status() {
            StatusCode::OK => {
                // 解析元数据
                let json: serde_json::Value = response.json()?;
                
                if let Some(success) = json.get("success").and_then(|v| v.as_bool()) {
                    if success {
                        // 提取版本信息
                        let version = json.get("version")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string();
                            
                        // 提取表列表
                        let tables = if let Some(tables_array) = json.get("tables").and_then(|v| v.as_array()) {
                            tables_array.iter()
                                .filter_map(|v| v.as_str())
                                .map(|s| s.to_string())
                                .collect()
                        } else {
                            Vec::new()
                        };
                        
                        return Ok(DatabaseMetadata {
                            db_type: self.info.db_type.clone(),
                            version,
                            tables,
                        });
                    } else {
                        // 错误响应
                        let error_msg = json.get("error")
                            .and_then(|e| e.get("message"))
                            .and_then(|m| m.as_str())
                            .unwrap_or("Unknown error");
                            
                        return Err(anyhow!("Failed to get metadata: {}", error_msg));
                    }
                }
                
                Err(anyhow!("Invalid response format"))
            },
            status => {
                // 处理HTTP错误
                Err(anyhow!("HTTP error: {}", status))
            }
        }
    }
    
    /// 关闭连接
    pub fn close(&self) -> Result<()> {
        // 目前不需要特别的关闭逻辑
        log::debug!("关闭连接: {}", self.info.to_connection_string());
        Ok(())
    }
} 