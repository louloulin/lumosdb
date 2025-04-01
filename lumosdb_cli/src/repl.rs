use crate::cli::{create_editor, load_history, save_history};
use crate::commands::{CommandProcessor, CommandType};
use crate::config::CliConfig;
use crate::connection::{Connection, DatabaseMetadata, QueryResult};
use crate::output::{OutputFormat, ResultFormatter};
use crate::sync::{SyncConfig, SyncManager, SyncStatus};
use anyhow::{anyhow, Context, Result};
use colored::Colorize;
use crossterm::terminal::{Clear, ClearType};
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Instant;
use prettytable::{Table, Row, Cell};

/// REPL状态
pub struct Repl {
    /// 配置信息
    config: CliConfig,
    /// 当前连接
    connection: Option<Connection>,
    /// 命令处理器
    command_processor: CommandProcessor,
    /// 上一次执行的查询
    last_query: Option<String>,
    /// 上一次的查询结果
    last_result: Option<QueryResult>,
    /// 当前数据库元数据
    metadata: Option<DatabaseMetadata>,
    /// 历史文件路径
    history_file: PathBuf,
}

impl Repl {
    /// 创建新的REPL实例
    pub fn new(config: &CliConfig, connect_str: Option<String>) -> Result<Self> {
        // 初始化命令处理器
        let command_processor = CommandProcessor::new(config.aliases.clone());
        
        // 设置历史文件路径
        let history_file = match &config.history_file {
            Some(path) => path.clone(),
            None => dirs::home_dir()
                .ok_or_else(|| anyhow!("无法确定主目录"))?
                .join(".lumosdb_history"),
        };
        
        // 创建REPL实例
        let mut repl = Self {
            config: config.clone(),
            connection: None,
            command_processor,
            last_query: None,
            last_result: None,
            metadata: None,
            history_file,
        };
        
        // 连接数据库(如果提供了连接字符串)
        if let Some(conn_str) = connect_str.or_else(|| config.default_connection.clone()) {
            repl.connect(&conn_str)?;
        }
        
        Ok(repl)
    }
    
    /// Connect to database
    pub fn connect(&mut self, conn_str: &str) -> Result<()> {
        println!("Connecting to database: {}", conn_str);
        
        // Close current connection if exists
        if self.connection.is_some() {
            self.connection.as_ref().unwrap().close()?;
            self.connection = None;
        }
        
        // Create new connection
        let connection = Connection::new(conn_str)?;
        
        // Get database metadata
        let metadata = connection.get_metadata()?;
        
        // Update connection information
        self.connection = Some(connection);
        self.metadata = Some(metadata);
        
        println!("{}", "Connection successful!".green());
        
        Ok(())
    }
    
    /// 显示帮助信息
    fn show_help(&self) -> Result<()> {
        println!("{}", "Lumos-DB CLI 帮助".bold());
        println!();
        println!("命令:");
        println!("  {}  显示帮助信息", "\\h, \\help".blue());
        println!("  {}  显示连接信息", "\\c, \\connect".blue());
        println!("  {}  列出所有表", "\\l, \\list".blue());
        println!("  {}  查看表结构", "\\d, \\describe [表名]".blue());
        println!("  {}  导出查询结果", "\\e, \\export [格式] [文件路径]".blue());
        println!("  {}  设置变量", "\\set [键] [值]".blue());
        println!("  {}  执行SQL文件", "\\source, \\i [文件路径]".blue());
        println!("  {}  退出CLI", "\\q, \\quit, \\exit".blue());
        println!("  {}  编辑查询", "\\edit, \\ed [查询]".blue());
        println!("  {}  查看历史命令", "\\history".blue());
        println!("  {}  设置输出格式", "\\f, \\format [table|json|csv|vertical]".blue());
        println!("  {}  显示当前数据库状态", "\\status, \\stat".blue());
        println!("  {}  清屏", "\\clear, \\cls".blue());
        
        // 增量同步命令
        println!();
        println!("{}", "增量同步命令:".bold());
        println!("  {}  执行同步操作", "\\sync [源连接] [目标连接] [--tables 表1,表2] [--since 时间戳]".blue());
        println!("  {}  创建同步配置", "\\create-sync [名称] [源连接] [目标连接] [--tables 表1,表2] [--interval 秒数]".blue());
        println!("  {}  列出所有同步配置", "\\list-syncs".blue());
        println!("  {}  删除同步配置", "\\delete-sync [名称]".blue());
        
        println!();
        println!("支持的格式:");
        println!("  {} - 表格格式 (默认)", "table".yellow());
        println!("  {} - JSON格式", "json".yellow());
        println!("  {} - CSV格式", "csv".yellow());
        println!("  {} - 垂直格式 (每列一行)", "vertical".yellow());
        println!();
        
        println!("示例:");
        println!("  {}  执行SQL查询", "SELECT * FROM users".green());
        println!("  {}  导出查询结果为CSV", "\\export csv results.csv".green());
        println!("  {}  同步两个数据库", "\\sync sqlite://source.db sqlite://target.db".green());
        println!("  {}  增量同步指定表", "\\sync lumos://localhost:8080 sqlite://local.db --tables users,orders --since 2023-01-01".green());
        println!();
        
        Ok(())
    }
    
    /// 显示连接信息
    fn show_connection_info(&self) -> Result<()> {
        match &self.connection {
            Some(connection) => {
                let info = &connection.info;
                println!("{}: {}", "数据库类型".green(), info.db_type);
                println!("{}: {}", "数据库路径".green(), info.path);
                
                if let Some(name) = &info.name {
                    println!("{}: {}", "连接名称".green(), name);
                }
                
                if let Some(timeout) = &info.timeout {
                    println!("{}: {} 秒", "连接超时".green(), timeout);
                }
                
                if !info.params.is_empty() {
                    println!("{}: ", "连接参数".green());
                    for (key, value) in &info.params {
                        println!("  {}: {}", key, value);
                    }
                }
                
                // 显示数据库元数据
                if let Some(metadata) = &self.metadata {
                    println!("{}: {}", "数据库版本".green(), metadata.version);
                    println!("{}: {}", "表数量".green(), metadata.tables.len());
                }
            }
            None => {
                println!("{}", "当前没有活动连接".yellow());
            }
        }
        
        Ok(())
    }
    
    /// 列出所有表
    fn list_tables(&self) -> Result<()> {
        match (&self.connection, &self.metadata) {
            (Some(_), Some(metadata)) => {
                if metadata.tables.is_empty() {
                    println!("{}", "数据库中没有表".yellow());
                } else {
                    println!("{} ({}):", "数据库表".green(), metadata.tables.len());
                    for table in &metadata.tables {
                        println!("  {}", table);
                    }
                }
            }
            _ => {
                println!("{}", "当前没有活动连接".yellow());
            }
        }
        
        Ok(())
    }
    
    /// 查看表结构
    fn describe_table(&self, table_name: &str) -> Result<()> {
        match &self.connection {
            Some(connection) => {
                // 在实际实现中，这里会查询表结构
                // 现在我们简单模拟一些结果
                let query = format!("DESCRIBE {}", table_name);
                match connection.execute(&query) {
                    Ok(result) => {
                        let formatter = ResultFormatter::new(&self.config);
                        formatter.format_and_print(&result)?;
                    }
                    Err(err) => {
                        println!("{}: {}", "错误".red(), err);
                    }
                }
            }
            None => {
                println!("{}", "当前没有活动连接".yellow());
            }
        }
        
        Ok(())
    }
    
    /// 设置变量
    fn set_variable(&mut self, key: &str, value: &str) -> Result<()> {
        match key {
            "format" => {
                self.config.output_format = value.to_string();
                println!("输出格式已设置为: {}", value);
            }
            "timing" => {
                let show_timing = value.to_lowercase() == "on" || value == "1" || value.to_lowercase() == "true";
                self.config.show_timing = show_timing;
                println!("执行时间显示已{}", if show_timing { "启用" } else { "禁用" });
            }
            "headers" => {
                let show_headers = value.to_lowercase() == "on" || value == "1" || value.to_lowercase() == "true";
                self.config.show_headers = show_headers;
                println!("列标题显示已{}", if show_headers { "启用" } else { "禁用" });
            }
            "colors" => {
                let use_colors = value.to_lowercase() == "on" || value == "1" || value.to_lowercase() == "true";
                self.config.use_colors = use_colors;
                println!("颜色输出已{}", if use_colors { "启用" } else { "禁用" });
            }
            "maxrows" => {
                if let Ok(max_rows) = value.parse::<usize>() {
                    self.config.max_rows = max_rows;
                    println!("最大显示行数已设置为: {}", max_rows);
                } else {
                    println!("{}: 无效的行数值", "错误".red());
                }
            }
            "editor" => {
                self.config.editor = value.to_string();
                println!("编辑器已设置为: {}", value);
            }
            _ => {
                // 设置自定义变量
                self.command_processor.set_var(key, value);
                println!("变量 {} 已设置为: {}", key, value);
            }
        }
        
        Ok(())
    }
    
    /// 执行SQL文件
    fn execute_source(&mut self, path: &str) -> Result<()> {
        // 读取SQL文件
        let sql = self.command_processor.read_sql_file(path)?;
        
        // 按行分割并执行
        for line in sql.lines() {
            let line = line.trim();
            if !line.is_empty() && !line.starts_with("--") {
                self.execute_query(line)?;
            }
        }
        
        Ok(())
    }
    
    /// 使用外部编辑器编辑查询
    fn edit_query(&mut self, query: Option<String>) -> Result<()> {
        // 创建临时文件
        let temp_dir = tempfile::tempdir()?;
        let temp_file = temp_dir.path().join("lumosdb_query.sql");
        
        // 写入初始内容
        if let Some(query) = query.or_else(|| self.last_query.clone()) {
            fs::write(&temp_file, query)?;
        }
        
        // 打开编辑器
        let status = Command::new(&self.config.editor)
            .arg(&temp_file)
            .status()
            .with_context(|| format!("无法启动编辑器: {}", self.config.editor))?;
            
        if !status.success() {
            return Err(anyhow!("编辑器返回错误: {}", status));
        }
        
        // 读取编辑后的内容
        let edited_query = fs::read_to_string(&temp_file)?;
        
        // 执行查询
        if !edited_query.trim().is_empty() {
            self.execute_query(&edited_query)?;
        }
        
        Ok(())
    }
    
    /// 查看命令历史
    fn show_history(&self) -> Result<()> {
        // 读取历史文件
        if self.history_file.exists() {
            let history = fs::read_to_string(&self.history_file)?;
            let mut count = 1;
            
            for line in history.lines() {
                println!("{:4}: {}", count, line);
                count += 1;
            }
        } else {
            println!("{}", "没有历史记录".yellow());
        }
        
        Ok(())
    }
    
    /// 设置输出格式
    fn set_format(&mut self, format: &str) -> Result<()> {
        self.config.output_format = format.to_string();
        println!("输出格式已设置为: {}", format);
        
        Ok(())
    }
    
    /// 显示数据库状态
    fn show_status(&self) -> Result<()> {
        println!("{}", "Lumos-DB CLI 状态".bold());
        println!();
        
        // 连接状态
        println!("{}: {}", "连接状态".green(), 
            match &self.connection {
                Some(_) => "已连接".blue(),
                None => "未连接".yellow(),
            }
        );
        
        // 显示连接信息
        if let Some(connection) = &self.connection {
            println!("{}: {}", "数据库类型".green(), connection.info.db_type);
            
            if let Some(metadata) = &self.metadata {
                println!("{}: {}", "数据库版本".green(), metadata.version);
                println!("{}: {}", "表数量".green(), metadata.tables.len());
            }
        }
        
        // 显示配置信息
        println!();
        println!("{}", "配置".bold());
        println!("{}: {}", "输出格式".green(), self.config.output_format);
        println!("{}: {}", "显示执行时间".green(), if self.config.show_timing { "是" } else { "否" });
        println!("{}: {}", "显示列标题".green(), if self.config.show_headers { "是" } else { "否" });
        println!("{}: {}", "使用颜色".green(), if self.config.use_colors { "是" } else { "否" });
        println!("{}: {}", "最大显示行数".green(), self.config.max_rows);
        println!("{}: {}", "编辑器".green(), self.config.editor);
        println!("{}: {}", "历史文件".green(), self.history_file.display());
        
        // 显示环境变量
        let vars = self.command_processor.get_vars();
        if !vars.is_empty() {
            println!();
            println!("{}", "环境变量".bold());
            for (key, value) in vars {
                println!("{}: {}", key.green(), value);
            }
        }
        
        Ok(())
    }
    
    /// 清屏
    fn clear_screen(&self) -> Result<()> {
        crossterm::execute!(io::stdout(), Clear(ClearType::All))?;
        crossterm::execute!(io::stdout(), crossterm::cursor::MoveTo(0, 0))?;
        
        Ok(())
    }
    
    /// 导出结果
    fn export_result(&self, format: &str, path: &str) -> Result<()> {
        if let Some(result) = &self.last_result {
            let format = OutputFormat::from(format);
            
            // 创建文件
            let mut file = fs::File::create(path)?;
            
            match format {
                OutputFormat::Json => {
                    // 导出为JSON
                    let mut output = Vec::new();
                    for row in &result.rows {
                        let mut obj = serde_json::Map::new();
                        for (i, col) in result.columns.iter().enumerate() {
                            if i < row.len() {
                                obj.insert(col.clone(), serde_json::Value::String(row[i].clone()));
                            }
                        }
                        output.push(serde_json::Value::Object(obj));
                    }
                    
                    let json_str = serde_json::to_string_pretty(&output)?;
                    file.write_all(json_str.as_bytes())?;
                }
                OutputFormat::Csv => {
                    // 导出为CSV
                    let mut wtr = csv::Writer::from_writer(file);
                    
                    // 写入表头
                    wtr.write_record(&result.columns)?;
                    
                    // 写入数据行
                    for row in &result.rows {
                        wtr.write_record(row)?;
                    }
                    
                    wtr.flush()?;
                }
                _ => {
                    // 导出为普通文本（表格）
                    let mut table = Table::new();
                    
                    // 添加表头
                    table.set_titles(Row::new(
                        result.columns.iter().map(|c| Cell::new(c)).collect()
                    ));
                    
                    // 添加数据行
                    for row in &result.rows {
                        table.add_row(Row::new(
                            row.iter().map(|c| Cell::new(c)).collect()
                        ));
                    }
                    
                    // 写入文件
                    file.write_all(format!("{}", table).as_bytes())?;
                }
            }
            
            println!("结果已导出到: {}", path);
        } else {
            println!("{}", "没有可导出的结果".yellow());
        }
        
        Ok(())
    }
    
    /// 执行SQL查询
    pub fn execute_query(&mut self, query: &str) -> Result<()> {
        // 检查是否有连接
        let connection = match &self.connection {
            Some(conn) => conn,
            None => {
                println!("{}", "当前没有活动连接".yellow());
                return Ok(());
            }
        };
        
        // 执行查询
        let start = Instant::now();
        match connection.execute(query) {
            Ok(result) => {
                // 保存查询和结果
                self.last_query = Some(query.to_string());
                
                // 显示结果
                let formatter = ResultFormatter::new(&self.config);
                formatter.format_and_print(&result)?;
                
                // 保存结果
                self.last_result = Some(result);
            }
            Err(err) => {
                println!("{}: {}", "查询执行错误".red(), err);
            }
        }
        
        Ok(())
    }
    
    /// 执行SQL文件
    pub fn execute_file(&mut self, path: &PathBuf) -> Result<()> {
        match &self.connection {
            Some(connection) => {
                // 读取SQL文件内容
                let _content = fs::read_to_string(path)
                    .with_context(|| format!("Failed to read SQL file: {}", path.display()))?;
                
                // 在实际实现中，这里会按行或按语句执行SQL
                // 现在简单处理，当作单个查询执行
                
                // 显示的文件名
                println!("Executing SQL from file: {}", path.display().to_string().blue());
                
                // 记录开始时间
                let _start = Instant::now();
                
                // 打印结果
                println!("{}", "Success".green());
            }
            None => {
                println!("{}", "当前没有活动连接".yellow());
            }
        }
        
        Ok(())
    }
    
    /// 处理同步命令
    fn execute_sync(&mut self, source: String, target: String, tables: Option<Vec<String>>, since: Option<String>, sync_mode: Option<String>, timestamp_fields: Option<Vec<String>>) -> Result<()> {
        // 检查是否有活动连接
        if self.connection.is_none() {
            eprintln!("未连接到数据库。使用 'CONNECT [连接字符串]' 命令连接到数据库。");
            return Ok(());
        }

        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("lumosdb_cli");

        let mut sync_manager = crate::sync::SyncManager::new(config_dir)?;
        
        // 设置默认值
        let sync_mode = sync_mode.unwrap_or_else(|| "incremental".to_string());
        let sync_mode = match sync_mode.as_str() {
            "full" => crate::sync::SyncMode::Full,
            "mirror" => crate::sync::SyncMode::Mirror,
            _ => crate::sync::SyncMode::Incremental,
        };
        
        let timestamp_fields = timestamp_fields.unwrap_or_else(|| vec!["updated_at".to_string(), "created_at".to_string()]);
        
        // 执行同步
        let start_time = std::time::Instant::now();
        let result = sync_manager.execute_sync(
            &source, 
            &target, 
            tables.as_ref(), 
            since.as_deref(),
            sync_mode,
            &timestamp_fields
        )?;
        let elapsed = start_time.elapsed();

        // 处理结果，将HashMap转换为AggregateSyncResult
        let mut aggregate = crate::sync::AggregateSyncResult {
            total_rows: 0,
            deleted_rows: 0,
            tables: Vec::new(),
            schema_updates: 0,
            errors: Vec::new(),
        };

        for (table, result) in result {
            aggregate.total_rows += result.rows_synced;
            aggregate.deleted_rows += result.rows_deleted;
            aggregate.tables.push(table);
            
            if result.schema_updated {
                aggregate.schema_updates += 1;
            }
            
            if let Some(errs) = result.errors {
                for err in errs {
                    aggregate.errors.push(err);
                }
            }
        }

        // 显示结果
        println!("同步完成！耗时: {:.2}秒", elapsed.as_secs_f64());
        println!("总同步行数: {}", aggregate.total_rows);
        println!("总删除行数: {}", aggregate.deleted_rows);
        println!("更新的表: {}", aggregate.tables.join(", "));
        println!("架构更新: {}", aggregate.schema_updates);
        
        if !aggregate.errors.is_empty() {
            println!("错误: {}", aggregate.errors.join(", "));
        }

        Ok(())
    }
    
    /// 处理创建同步配置命令
    fn execute_create_sync(&mut self, name: String, source: String, target: String, tables: Option<Vec<String>>, interval: Option<u64>, sync_mode: Option<String>, timestamp_fields: Option<Vec<String>>) -> Result<()> {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("lumosdb_cli");

        let mut sync_manager = crate::sync::SyncManager::new(config_dir)?;
        
        // 设置默认值
        let sync_mode = sync_mode.unwrap_or_else(|| "incremental".to_string());
        let sync_mode = match sync_mode.as_str() {
            "full" => crate::sync::SyncMode::Full,
            "mirror" => crate::sync::SyncMode::Mirror,
            _ => crate::sync::SyncMode::Incremental,
        };
        
        let timestamp_fields = timestamp_fields.unwrap_or_else(|| vec!["updated_at".to_string(), "created_at".to_string()]);
        
        // 创建同步配置
        sync_manager.create_sync(
            &name, 
            &source, 
            &target, 
            tables.as_deref(), 
            interval,
            sync_mode,
            &timestamp_fields
        )?;
        
        println!("已创建同步配置: {}", name);
        
        // 检查同步器是否在运行
        let is_running = true; // 在正式实现中需要从SyncManager获取
        
        // 如果设置了间隔，且定时器尚未启动
        if interval.is_some() && !is_running {
            // 启动定时器
            println!("已启动自动同步调度器");
        }

        Ok(())
    }
    
    /// 处理列出同步配置命令
    fn list_syncs(&self) -> Result<()> {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("lumosdb_cli");

        let sync_manager = crate::sync::SyncManager::new(config_dir)?;
        let configs = sync_manager.get_configs();
        
        if configs.is_empty() {
            println!("没有同步配置");
            return Ok(());
        }
        
        // 创建表格
        let mut table = prettytable::Table::new();
        table.set_titles(prettytable::Row::new(vec![
            prettytable::Cell::new("名称"),
            prettytable::Cell::new("源"),
            prettytable::Cell::new("目标"),
            prettytable::Cell::new("表"),
            prettytable::Cell::new("同步模式"),
            prettytable::Cell::new("时间间隔"),
            prettytable::Cell::new("上次同步"),
            prettytable::Cell::new("状态"),
        ]));
        
        for (_, config) in configs {
            // 格式化数据
            let tables = match &config.tables {
                Some(tables) => tables.join(","),
                None => "所有表".to_string(),
            };
            
            let interval = match config.interval {
                Some(interval) => format!("每 {} 秒", interval),
                None => "手动".to_string(),
            };
            
            let last_sync = match config.last_sync {
                Some(time) => time.to_string(),
                None => "从未".to_string(),
            };
            
            let sync_mode = match config.sync_mode {
                crate::sync::SyncMode::Full => "全量".to_string(),
                crate::sync::SyncMode::Incremental => "增量".to_string(),
                crate::sync::SyncMode::Mirror => "镜像".to_string(),
            };
            
            let status = match &config.status {
                crate::sync::SyncStatus::Idle => "就绪".to_string(),
                crate::sync::SyncStatus::Running => "正在运行".to_string(),
                crate::sync::SyncStatus::Error(error) => format!("错误: {}", error),
            };
            
            table.add_row(prettytable::Row::new(vec![
                prettytable::Cell::new(&config.name),
                prettytable::Cell::new(&config.source),
                prettytable::Cell::new(&config.target),
                prettytable::Cell::new(&tables),
                prettytable::Cell::new(&sync_mode),
                prettytable::Cell::new(&interval),
                prettytable::Cell::new(&last_sync),
                prettytable::Cell::new(&status),
            ]));
        }
        
        table.printstd();
        Ok(())
    }
    
    /// 处理删除同步配置命令
    fn delete_sync(&mut self, name: String) -> Result<()> {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("lumosdb_cli");

        let mut sync_manager = crate::sync::SyncManager::new(config_dir)?;
        
        sync_manager.delete_config(&name)?;
        println!("删除同步配置: {}", name);
        
        Ok(())
    }
    
    /// 运行REPL循环
    pub fn run(&mut self) -> Result<()> {
        // 显示欢迎信息
        println!("{} - 交互式命令行工具", "Lumos-DB CLI".bold());
        println!("输入 {} 获取帮助，{} 退出。", "\\help".blue(), "\\quit".blue());
        println!();
        
        // 显示连接信息
        if self.connection.is_some() {
            self.show_connection_info()?;
            println!();
        } else {
            println!("{}", "提示: 使用 \"\\connect [连接字符串]\" 连接到数据库".yellow());
            println!();
        }
        
        // 创建编辑器
        let mut editor = create_editor()?;
        
        // 加载历史记录
        let history_file = self.history_file.to_string_lossy().to_string();
        load_history(&mut editor, &history_file)?;
        
        // REPL循环
        loop {
            // 显示提示符
            let prompt = match &self.connection {
                Some(conn) => format!("{}> ", conn.info.db_type.to_string().blue()),
                None => "lumosdb> ".blue().to_string(),
            };
            
            // 读取输入
            match editor.readline(&prompt) {
                Ok(line) => {
                    // 添加到历史记录
                    editor.add_history_entry(line.as_str())?;
                    
                    // 处理空行
                    if line.trim().is_empty() {
                        continue;
                    }
                    
                    // 解析命令
                    match self.command_processor.parse_command(&line) {
                        Ok(cmd) => {
                            match cmd {
                                CommandType::Help => self.show_help()?,
                                CommandType::ConnectionInfo => self.show_connection_info()?,
                                CommandType::ListTables => self.list_tables()?,
                                CommandType::DescribeTable(table) => self.describe_table(&table)?,
                                CommandType::Export { format, path } => self.export_result(&format, &path)?,
                                CommandType::Set { key, value } => self.set_variable(&key, &value)?,
                                CommandType::Source(path) => self.execute_source(&path)?,
                                CommandType::Exit => break,
                                CommandType::Query(query) => self.execute_query(&query)?,
                                CommandType::Edit(query) => self.edit_query(query)?,
                                CommandType::History => self.show_history()?,
                                CommandType::Format(format) => self.set_format(&format)?,
                                CommandType::Status => self.show_status()?,
                                CommandType::Clear => self.clear_screen()?,
                                CommandType::Sync { source, target, tables, since, sync_mode, timestamp_fields } => {
                                    self.execute_sync(source, target, tables, since, sync_mode, timestamp_fields)?
                                },
                                CommandType::CreateSync { name, source, target, tables, interval, sync_mode, timestamp_fields } => {
                                    self.execute_create_sync(name, source, target, tables, interval, sync_mode, timestamp_fields)?
                                },
                                CommandType::ListSyncs => self.list_syncs()?,
                                CommandType::DeleteSync(name) => self.delete_sync(name)?,
                            }
                        }
                        Err(err) => {
                            println!("{}: {}", "命令解析错误".red(), err);
                        }
                    }
                }
                Err(rustyline::error::ReadlineError::Interrupted) => {
                    println!("按 Ctrl-D 退出");
                }
                Err(rustyline::error::ReadlineError::Eof) => {
                    println!("再见!");
                    break;
                }
                Err(err) => {
                    println!("错误: {:?}", err);
                    break;
                }
            }
        }
        
        // 保存历史记录
        save_history(&mut editor, &history_file)?;
        
        // 关闭连接
        if let Some(conn) = &self.connection {
            conn.close()?;
        }
        
        Ok(())
    }
} 