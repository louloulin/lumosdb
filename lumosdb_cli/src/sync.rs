use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use crate::connection::Connection;
use crate::config::CliConfig;

/// 同步配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    /// 配置名称
    pub name: String,
    /// 源连接字符串
    pub source: String,
    /// 目标连接字符串
    pub target: String,
    /// 同步的表（如果为空，则同步所有表）
    pub tables: Option<Vec<String>>,
    /// 同步间隔（秒）
    pub interval: Option<u64>,
    /// 最后同步时间
    pub last_sync: Option<DateTime<Utc>>,
    /// 同步状态
    pub status: SyncStatus,
}

/// 同步状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SyncStatus {
    /// 未运行
    Idle,
    /// 正在运行
    Running,
    /// 失败
    Failed(String),
    /// 成功
    Completed,
}

impl SyncConfig {
    /// 创建新的同步配置
    pub fn new(
        name: String,
        source: String,
        target: String,
        tables: Option<Vec<String>>,
        interval: Option<u64>,
    ) -> Self {
        Self {
            name,
            source,
            target,
            tables,
            interval,
            last_sync: None,
            status: SyncStatus::Idle,
        }
    }
}

/// 同步管理器
pub struct SyncManager {
    /// 配置文件路径
    config_path: PathBuf,
    /// 同步配置
    configs: HashMap<String, SyncConfig>,
}

impl SyncManager {
    /// 创建新的同步管理器
    pub fn new(config_dir: &Path) -> Result<Self> {
        let config_path = config_dir.join("syncs.json");
        let configs = if config_path.exists() {
            let content = fs::read_to_string(&config_path)?;
            serde_json::from_str::<HashMap<String, SyncConfig>>(&content)?
        } else {
            HashMap::new()
        };
        
        Ok(Self {
            config_path,
            configs,
        })
    }
    
    /// 保存配置
    pub fn save(&self) -> Result<()> {
        // 确保父目录存在
        if let Some(parent) = self.config_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)?;
            }
        }
        
        let content = serde_json::to_string_pretty(&self.configs)?;
        fs::write(&self.config_path, content)?;
        
        Ok(())
    }
    
    /// 添加同步配置
    pub fn add_config(&mut self, config: SyncConfig) -> Result<()> {
        if self.configs.contains_key(&config.name) {
            return Err(anyhow!("同步配置 '{}' 已存在", config.name));
        }
        
        self.configs.insert(config.name.clone(), config);
        self.save()?;
        
        Ok(())
    }
    
    /// 删除同步配置
    pub fn delete_config(&mut self, name: &str) -> Result<()> {
        if !self.configs.contains_key(name) {
            return Err(anyhow!("同步配置 '{}' 不存在", name));
        }
        
        self.configs.remove(name);
        self.save()?;
        
        Ok(())
    }
    
    /// 获取所有同步配置
    pub fn get_configs(&self) -> &HashMap<String, SyncConfig> {
        &self.configs
    }
    
    /// 获取特定同步配置
    pub fn get_config(&self, name: &str) -> Option<&SyncConfig> {
        self.configs.get(name)
    }
    
    /// 更新同步配置状态
    pub fn update_status(&mut self, name: &str, status: SyncStatus) -> Result<()> {
        let config = self.configs.get_mut(name).ok_or_else(|| anyhow!("同步配置 '{}' 不存在", name))?;
        let is_completed = status == SyncStatus::Completed;
        config.status = status;
        
        if is_completed {
            config.last_sync = Some(Utc::now());
        }
        
        self.save()?;
        
        Ok(())
    }
    
    /// 执行同步
    pub fn execute_sync(
        &mut self,
        _cli_config: &CliConfig,
        source: &str,
        target: &str,
        tables: Option<&Vec<String>>,
        since: Option<&str>,
    ) -> Result<HashMap<String, SyncResult>> {
        // 创建源连接
        let source_conn = Connection::new(source)?;
        
        // 创建目标连接
        let target_conn = Connection::new(target)?;
        
        // 获取源数据库中的表
        let metadata = source_conn.get_metadata()?;
        let tables_to_sync = match tables {
            Some(tables) => tables.clone(),
            None => metadata.tables.clone(),
        };
        
        let mut results = HashMap::new();
        
        for table in tables_to_sync {
            // 执行表同步
            match self.sync_table(&source_conn, &target_conn, &table, since) {
                Ok(result) => {
                    results.insert(table, result);
                }
                Err(e) => {
                    results.insert(table.clone(), SyncResult {
                        rows_synced: 0,
                        errors: Some(vec![format!("同步表 '{}' 失败: {}", table, e)]),
                    });
                }
            }
        }
        
        Ok(results)
    }
    
    /// 同步单个表
    fn sync_table(
        &self,
        source_conn: &Connection,
        target_conn: &Connection,
        table: &str,
        since: Option<&str>,
    ) -> Result<SyncResult> {
        // 检查表是否存在
        let source_metadata = source_conn.get_metadata()?;
        if !source_metadata.tables.contains(&table.to_string()) {
            return Err(anyhow!("源数据库中不存在表 '{}'", table));
        }
        
        // 构建查询
        let mut query = format!("SELECT * FROM {}", table);
        
        // 如果指定了时间条件，添加条件子句
        if let Some(timestamp) = since {
            // 这里假设表中有updated_at或created_at字段
            query.push_str(&format!(" WHERE updated_at >= '{}' OR created_at >= '{}'", timestamp, timestamp));
        }
        
        // 查询源数据库
        let result = source_conn.execute(&query)?;
        
        if result.rows.is_empty() {
            return Ok(SyncResult {
                rows_synced: 0,
                errors: None,
            });
        }
        
        // 构建目标数据库中的插入语句
        let mut errors = Vec::new();
        let mut rows_synced = 0;
        
        for row in &result.rows {
            // 构建INSERT语句
            let mut values = Vec::new();
            for value in row {
                // 引用字符串值
                if value.starts_with('"') || value.parse::<f64>().is_err() && value != "NULL" && !value.to_lowercase().starts_with("true") && !value.to_lowercase().starts_with("false") {
                    values.push(format!("'{}'", value.replace('\'', "''")));
                } else {
                    values.push(value.clone());
                }
            }
            
            let insert_query = format!("INSERT OR REPLACE INTO {} ({}) VALUES ({})",
                table,
                result.columns.join(", "),
                values.join(", ")
            );
            
            // 执行插入语句
            match target_conn.execute(&insert_query) {
                Ok(_) => {
                    rows_synced += 1;
                }
                Err(e) => {
                    errors.push(format!("插入行到表 '{}' 失败: {}", table, e));
                }
            }
        }
        
        Ok(SyncResult {
            rows_synced,
            errors: if errors.is_empty() { None } else { Some(errors) },
        })
    }
}

/// 同步结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    /// 同步的行数
    pub rows_synced: usize,
    /// 错误信息
    pub errors: Option<Vec<String>>,
} 