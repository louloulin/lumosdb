use anyhow::{anyhow, Context as _, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

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
    pub last_sync: Option<u64>,
    /// 同步状态
    pub status: SyncStatus,
    /// 同步模式
    pub sync_mode: SyncMode,
    /// 时间戳字段（用于增量同步）
    pub timestamp_fields: Vec<String>,
}

/// 同步模式
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncMode {
    /// 全量同步 - 同步所有数据
    Full,
    
    /// 增量同步 - 只同步自上次同步以来有变更的数据
    Incremental,
    
    /// 镜像同步 - 将目标库完全镜像为源库的状态（包括删除目标库中不存在于源库的数据）
    Mirror,
}

impl Default for SyncMode {
    fn default() -> Self {
        Self::Incremental
    }
}

/// 同步状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncStatus {
    /// 未运行
    Idle,
    
    /// 正在运行
    Running,
    
    /// 出错
    Error(String),
}

impl SyncConfig {
    /// 创建新的同步配置
    pub fn new(
        name: String,
        source: String,
        target: String,
        tables: Option<Vec<String>>,
        interval: Option<u64>,
        sync_mode: SyncMode,
        timestamp_fields: Vec<String>,
    ) -> Self {
        Self {
            name,
            source,
            target,
            tables,
            interval,
            last_sync: None,
            status: SyncStatus::Idle,
            sync_mode,
            timestamp_fields,
        }
    }

    /// 是否应该执行同步
    pub fn should_sync_now(&self) -> bool {
        if self.status == SyncStatus::Running {
            return false; // 已经在运行了
        }

        if let Some(interval) = self.interval {
            if let Some(last_sync) = self.last_sync {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                
                return now >= last_sync + interval;
            } else {
                return true; // 从未同步过，应该执行
            }
        }

        false // 没有设置间隔，不自动执行
    }
}

/// 同步管理器
pub struct SyncManager {
    /// 配置文件路径
    config_dir: PathBuf,
    /// 同步配置
    configs: HashMap<String, SyncConfig>,
    /// 定时器线程句柄
    scheduler_handle: Option<thread::JoinHandle<()>>,
    /// 共享状态，用于线程间通信
    scheduler_control: Arc<Mutex<bool>>,
}

impl SyncManager {
    /// 创建新的同步管理器
    pub fn new(config_dir: PathBuf) -> Result<Self> {
        // 确保配置目录存在
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir)?;
        }
        
        // 初始化配置
        let configs_path = config_dir.join("sync_configs.json");
        let configs = if configs_path.exists() {
            let contents = fs::read_to_string(&configs_path)
                .context("无法读取同步配置文件")?;
            serde_json::from_str(&contents)
                .context("无法解析同步配置文件")?
        } else {
            HashMap::new()
        };
        
        Ok(Self {
            config_dir,
            configs,
            scheduler_handle: None,
            scheduler_control: Arc::new(Mutex::new(false)),
        })
    }
    
    /// 创建同步配置
    pub fn create_sync(
        &mut self,
        name: &str,
        source: &str,
        target: &str,
        tables: Option<&[String]>,
        interval: Option<u64>,
        sync_mode: SyncMode,
        timestamp_fields: &[String],
    ) -> Result<()> {
        let tables = tables.map(|t| t.to_vec());
        let timestamp_fields = timestamp_fields.to_vec();
        
        let config = SyncConfig::new(
            name.to_string(),
            source.to_string(),
            target.to_string(),
            tables,
            interval,
            sync_mode,
            timestamp_fields,
        );
        
        self.add_sync_config(config)
    }
    
    /// 保存配置
    pub fn save(&self) -> Result<()> {
        // 确保父目录存在
        if let Some(parent) = self.config_dir.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)?;
            }
        }
        
        let content = serde_json::to_string_pretty(&self.configs)?;
        fs::write(&self.config_dir.join("sync_configs.json"), content)?;
        
        Ok(())
    }
    
    /// 添加同步配置
    pub fn add_sync_config(&mut self, config: SyncConfig) -> Result<()> {
        // 添加配置
        self.configs.insert(config.name.clone(), config);
        
        // 保存配置
        self.save()?;
        
        // 如果有定时任务，确保调度器在运行
        let has_scheduled_syncs = self.configs.values().any(|c| c.interval.is_some());
        if has_scheduled_syncs {
            self.start_scheduler()?;
        }
        
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
        let is_completed = status == SyncStatus::Error(String::new());
        config.status = status;
        
        if is_completed {
            config.last_sync = Some(SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs());
        }
        
        self.save()?;
        
        Ok(())
    }

    /// 启动调度器
    pub fn start_scheduler(&mut self) -> Result<()> {
        if let Some(handle) = &self.scheduler_handle {
            if !handle.is_finished() {
                return Ok(());
            }
        }
        
        // 设置调度器控制为运行状态
        {
            let mut running = self.scheduler_control.lock().unwrap();
            *running = true;
        }
        
        // 克隆需要在线程中使用的值
        let config_dir = self.config_dir.clone();
        let control = self.scheduler_control.clone();
        
        // 创建调度器线程
        let handle = thread::spawn(move || {
            // 调度器循环
            while {
                let running = control.lock().unwrap();
                *running
            } {
                // 检查是否有需要同步的配置
                if let Ok(mut manager) = SyncManager::new(config_dir.clone()) {
                    for (name, config) in manager.get_configs().clone() {
                        if config.should_sync_now() {
                            // 执行同步
                            let _ = manager.update_status(&name, SyncStatus::Running);
                            
                            if let Err(e) = manager.execute_sync(
                                &config.source,
                                &config.target,
                                config.tables.as_ref(),
                                None, // 使用上次同步时间
                                config.sync_mode,
                                &config.timestamp_fields,
                            ) {
                                let _ = manager.update_status(&name, SyncStatus::Error(e.to_string()));
                            } else {
                                let _ = manager.update_last_sync(&name);
                            }
                        }
                    }
                }
                
                // 每10秒检查一次
                thread::sleep(Duration::from_secs(10));
            }
        });
        
        self.scheduler_handle = Some(handle);
        Ok(())
    }

    /// 检查调度器是否运行
    pub fn is_scheduler_running(&self) -> bool {
        if let Some(handle) = &self.scheduler_handle {
            !handle.is_finished()
        } else {
            false
        }
    }

    /// 执行同步
    pub fn execute_sync(
        &mut self,
        source: &str,
        target: &str,
        tables: Option<&Vec<String>>,
        since: Option<&str>,
        sync_mode: SyncMode,
        timestamp_fields: &[String],
    ) -> Result<HashMap<String, SyncResult>> {
        // 这里实现实际的同步逻辑
        // 作为示例，我们只返回一个模拟的结果
        
        // 模拟同步过程
        thread::sleep(Duration::from_millis(500));
        
        // 创建结果
        let tables_vec = tables.cloned().unwrap_or_else(|| vec!["users".to_string(), "orders".to_string(), "products".to_string()]);
        let mut results = HashMap::new();
        
        // 为每个表创建一个结果
        for table in &tables_vec {
            results.insert(
                table.clone(),
                SyncResult {
                    rows_synced: 10,
                    rows_deleted: if sync_mode == SyncMode::Mirror { 2 } else { 0 },
                    schema_updated: true,
                    errors: None,
                },
            );
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
        timestamp_fields: &[String],
        sync_mode: &SyncMode,
    ) -> Result<SyncResult> {
        // 检查表是否存在
        let source_metadata = source_conn.get_metadata()?;
        if !source_metadata.tables.contains(&table.to_string()) {
            return Err(anyhow!("源数据库中不存在表 '{}'", table));
        }
        
        // 先同步表结构（如果需要）
        let schema_updated = match self.sync_table_schema(source_conn, target_conn, table) {
            Ok(updated) => updated,
            Err(e) => {
                log::warn!("同步表结构失败: {}", e);
                false
            }
        };
        
        // 构建查询
        let mut query = format!("SELECT * FROM {}", table);
        
        // 如果指定了时间条件，添加条件子句
        if let Some(timestamp) = since {
            if sync_mode == &SyncMode::Incremental {
                // 构建 WHERE 子句，使用所有提供的时间戳字段
                let conditions: Vec<String> = timestamp_fields
                    .iter()
                    .map(|field| format!("{} >= '{}'", field, timestamp))
                    .collect();
                
                if !conditions.is_empty() {
                    query.push_str(" WHERE ");
                    query.push_str(&conditions.join(" OR "));
                }
            }
        }
        
        // 查询源数据库
        let result = source_conn.execute(&query)?;
        
        if result.rows.is_empty() && sync_mode != &SyncMode::Mirror {
            return Ok(SyncResult {
                rows_synced: 0,
                rows_deleted: 0,
                schema_updated,
                errors: None,
            });
        }
        
        // 构建目标数据库中的插入语句
        let mut errors = Vec::new();
        let mut rows_synced = 0;
        
        // 开始事务
        target_conn.execute("BEGIN TRANSACTION")?;
        
        // 如果是镜像模式，可能需要先清空目标表
        let mut rows_deleted = 0;
        if sync_mode == &SyncMode::Mirror && since.is_none() {
            // 在镜像模式下，如果没有增量条件，我们先删除所有记录
            match target_conn.execute(&format!("DELETE FROM {}", table)) {
                Ok(result) => {
                    rows_deleted = result.affected_rows;
                }
                Err(e) => {
                    errors.push(format!("清空表 '{}' 失败: {}", table, e));
                    
                    // 回滚事务
                    if let Err(e) = target_conn.execute("ROLLBACK") {
                        log::error!("回滚事务失败: {}", e);
                    }
                    
                    return Ok(SyncResult {
                        rows_synced: 0,
                        rows_deleted: 0,
                        schema_updated,
                        errors: Some(errors),
                    });
                }
            }
        }
        
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
            
            // 使用UPSERT语法确保插入或更新
            let insert_query = format!(
                "INSERT OR REPLACE INTO {} ({}) VALUES ({})",
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
        
        // 镜像模式下，如果有增量条件，需要删除源数据库中不存在的记录
        if sync_mode == &SyncMode::Mirror && result.rows.len() > 0 && since.is_some() {
            // 识别主键列
            if let Some(primary_keys) = self.get_primary_keys(source_conn, table) {
                if !primary_keys.is_empty() {
                    // 收集源数据库中的所有主键值
                    let mut source_keys = Vec::new();
                    let pk_indices: Vec<usize> = primary_keys
                        .iter()
                        .filter_map(|pk| result.columns.iter().position(|c| c == pk))
                        .collect();
                    
                    for row in &result.rows {
                        let key_values: Vec<String> = pk_indices
                            .iter()
                            .filter_map(|&idx| row.get(idx).cloned())
                            .collect();
                        
                        if key_values.len() == pk_indices.len() {
                            source_keys.push(key_values);
                        }
                    }
                    
                    // 构建 WHERE 子句，排除源数据库中存在的记录
                    if !source_keys.is_empty() {
                        let mut delete_conditions = Vec::new();
                        
                        for key_values in source_keys {
                            let condition = primary_keys
                                .iter()
                                .zip(key_values.iter())
                                .map(|(pk, val)| {
                                    if val.parse::<f64>().is_err() && val != "NULL" && !val.to_lowercase().starts_with("true") && !val.to_lowercase().starts_with("false") {
                                        format!("{} <> '{}'", pk, val.replace('\'', "''"))
                                    } else {
                                        format!("{} <> {}", pk, val)
                                    }
                                })
                                .collect::<Vec<String>>()
                                .join(" AND ");
                            
                            delete_conditions.push(format!("({})", condition));
                        }
                        
                        let delete_query = format!(
                            "DELETE FROM {} WHERE {}",
                            table,
                            delete_conditions.join(" AND ")
                        );
                        
                        match target_conn.execute(&delete_query) {
                            Ok(result) => {
                                rows_deleted = result.affected_rows;
                            }
                            Err(e) => {
                                errors.push(format!("删除不存在的记录失败: {}", e));
                            }
                        }
                    }
                }
            }
        }
        
        // 提交事务
        if let Err(e) = target_conn.execute("COMMIT") {
            errors.push(format!("提交事务失败: {}", e));
            
            // 尝试回滚
            if let Err(e) = target_conn.execute("ROLLBACK") {
                errors.push(format!("回滚事务失败: {}", e));
            }
        }
        
        Ok(SyncResult {
            rows_synced,
            rows_deleted,
            schema_updated,
            errors: if errors.is_empty() { None } else { Some(errors) },
        })
    }
    
    /// 同步表结构
    fn sync_table_schema(
        &self,
        source_conn: &Connection,
        target_conn: &Connection,
        table: &str,
    ) -> Result<bool> {
        // 检查目标数据库是否存在该表
        let target_metadata = target_conn.get_metadata()?;
        if target_metadata.tables.contains(&table.to_string()) {
            // 表已存在，不需要创建
            return Ok(false);
        }
        
        // 查询源表结构
        let query = format!("PRAGMA table_info({})", table);
        let result = source_conn.execute(&query)?;
        
        if result.rows.is_empty() {
            return Err(anyhow!("无法获取表 '{}' 的结构信息", table));
        }
        
        // 构建CREATE TABLE语句
        let mut column_defs = Vec::new();
        let mut primary_keys = Vec::new();
        
        for row in &result.rows {
            if row.len() >= 6 {
                let name = &row[1];
                let col_type = &row[2];
                let not_null = row[3] == "1";
                let default_value = if row[4] == "NULL" { None } else { Some(&row[4]) };
                let is_pk = row[5] == "1";
                
                let mut col_def = format!("{} {}", name, col_type);
                
                if not_null {
                    col_def.push_str(" NOT NULL");
                }
                
                if let Some(default) = default_value {
                    col_def.push_str(&format!(" DEFAULT {}", default));
                }
                
                column_defs.push(col_def);
                
                if is_pk {
                    primary_keys.push(name.clone());
                }
            }
        }
        
        if !primary_keys.is_empty() {
            column_defs.push(format!("PRIMARY KEY ({})", primary_keys.join(", ")));
        }
        
        let create_table = format!(
            "CREATE TABLE IF NOT EXISTS {} ({})",
            table,
            column_defs.join(", ")
        );
        
        // 在目标数据库中创建表
        target_conn.execute(&create_table)?;
        
        Ok(true)
    }
    
    /// 获取表的主键
    fn get_primary_keys(&self, conn: &Connection, table: &str) -> Option<Vec<String>> {
        // 查询表的主键
        let query = format!("PRAGMA table_info({})", table);
        match conn.execute(&query) {
            Ok(result) => {
                let mut primary_keys = Vec::new();
                
                for row in &result.rows {
                    if row.len() >= 6 && row[5] == "1" {
                        primary_keys.push(row[1].clone());
                    }
                }
                
                if !primary_keys.is_empty() {
                    Some(primary_keys)
                } else {
                    None
                }
            }
            Err(_) => None,
        }
    }

    /// 更新上次同步时间
    pub fn update_last_sync(&mut self, name: &str) -> Result<()> {
        if let Some(config) = self.configs.get_mut(name) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            
            config.last_sync = Some(now);
            config.status = SyncStatus::Idle;
            
            self.save()?;
            Ok(())
        } else {
            Err(anyhow!("同步配置 '{}' 不存在", name))
        }
    }

    /// 停止调度器
    pub fn stop_scheduler(&mut self) -> Result<()> {
        if !self.is_scheduler_running() {
            return Ok(());
        }
        
        // 设置调度器控制为停止状态
        {
            let mut running = self.scheduler_control.lock().unwrap();
            *running = false;
        }
        
        // 等待线程结束
        if let Some(handle) = self.scheduler_handle.take() {
            if !handle.is_finished() {
                let _ = handle.join();
            }
        }
        
        Ok(())
    }
}

impl Drop for SyncManager {
    fn drop(&mut self) {
        self.stop_scheduler();
    }
}

/// 同步结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    /// 同步的行数
    pub rows_synced: usize,
    /// 删除的行数（仅在镜像模式下有效）
    pub rows_deleted: usize,
    /// 表结构是否更新
    pub schema_updated: bool,
    /// 错误信息
    pub errors: Option<Vec<String>>,
}

/// 聚合同步结果
#[derive(Debug, Clone, Default)]
pub struct AggregateSyncResult {
    /// 同步的总行数
    pub total_rows: usize,
    
    /// 删除的总行数
    pub deleted_rows: usize,
    
    /// 更新的表名
    pub tables: Vec<String>,
    
    /// 架构更新的表数量
    pub schema_updates: usize,
    
    /// 错误列表
    pub errors: Vec<String>,
} 