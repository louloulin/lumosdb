use actix::prelude::*;
use std::collections::HashMap;
use log::{info, warn, error};
use serde_json::Value;

use crate::types::{DataRecord, ETLError};
use crate::actors::messages::LoadData;

/// JDBC 加载器
pub struct JdbcLoader {
    /// 配置选项
    config: HashMap<String, Value>,
}

impl JdbcLoader {
    /// 创建新的JDBC加载器
    pub fn new(config: HashMap<String, Value>) -> Self {
        JdbcLoader { config }
    }

    /// 加载数据到数据库
    async fn load_to_database(&self, records: Vec<DataRecord>) -> Result<usize, ETLError> {
        // 获取连接配置
        let connection_string = self.config.get("connection_string")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ETLError::ConfigError("JDBC加载器需要'connection_string'参数".to_string()))?;
        
        let table_name = self.config.get("table_name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ETLError::ConfigError("JDBC加载器需要'table_name'参数".to_string()))?;
        
        // 确定数据库类型
        let db_type = if connection_string.contains("mysql") {
            "MySQL"
        } else if connection_string.contains("postgresql") {
            "PostgreSQL"
        } else if connection_string.contains("sqlserver") {
            "MSSQL"
        } else if connection_string.contains("oracle") {
            "Oracle"
        } else {
            "Unknown"
        };

        info!("正在连接到 {} 数据库: {}", db_type, connection_string);
        info!("准备加载 {} 条记录到表 '{}'", records.len(), table_name);

        // 在实际实现中，这里应该连接到数据库并执行插入/更新操作
        // 此处仅作为示例，显示如何处理记录
        
        let load_mode = self.config.get("load_mode")
            .and_then(|v| v.as_str())
            .unwrap_or("insert");

        match load_mode {
            "insert" => {
                info!("使用 INSERT 模式加载数据");
                // 模拟构建INSERT语句
                for (i, record) in records.iter().enumerate().take(3) {
                    if i == 0 {
                        info!("示例INSERT: 插入记录 {:?}", record);
                    }
                }
            },
            "update" => {
                info!("使用 UPDATE 模式加载数据");
                // 模拟构建UPDATE语句
                let key_column = self.config.get("key_column")
                    .and_then(|v| v.as_str())
                    .unwrap_or("id");
                
                info!("使用 '{}' 列作为更新键", key_column);
                
                for (i, record) in records.iter().enumerate().take(3) {
                    if i == 0 {
                        info!("示例UPDATE: 更新记录 {:?}", record);
                    }
                }
            },
            "upsert" => {
                info!("使用 UPSERT 模式加载数据");
                // 模拟构建UPSERT语句
                let key_column = self.config.get("key_column")
                    .and_then(|v| v.as_str())
                    .unwrap_or("id");
                
                info!("使用 '{}' 列作为更新键", key_column);
                
                for (i, record) in records.iter().enumerate().take(3) {
                    if i == 0 {
                        info!("示例UPSERT: 插入/更新记录 {:?}", record);
                    }
                }
            },
            _ => {
                warn!("未知的加载模式 '{}', 默认使用 INSERT", load_mode);
                // 默认INSERT处理
            }
        }

        // 模拟成功加载数据
        info!("成功加载 {} 条记录到 {} 数据库表 '{}'", records.len(), db_type, table_name);
        
        Ok(records.len())
    }
}

impl Actor for JdbcLoader {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        info!("JDBC加载器已启动");
    }
}

impl Handler<LoadData> for JdbcLoader {
    type Result = ResponseFuture<Result<usize, ETLError>>;

    fn handle(&mut self, msg: LoadData, _ctx: &mut Self::Context) -> Self::Result {
        info!("接收到加载数据请求，共 {} 条记录", msg.records.len());
        
        let config = self.config.clone();
        let records = msg.records.clone();
        
        Box::pin(async move {
            // 创建一个临时的加载器实例来处理请求
            // 这样可以避免Self生命周期问题
            let loader = JdbcLoader::new(config);
            loader.load_to_database(records).await
        })
    }
} 