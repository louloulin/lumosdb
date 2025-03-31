use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

/// CLI配置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CliConfig {
    /// 默认连接字符串
    pub default_connection: Option<String>,
    
    /// 历史文件路径
    pub history_file: Option<PathBuf>,
    
    /// 结果显示格式(table, json, csv)
    pub output_format: String,
    
    /// 最大显示行数
    pub max_rows: usize,
    
    /// 是否显示执行时间
    pub show_timing: bool,
    
    /// 是否启用自动完成
    pub enable_completion: bool,
    
    /// 是否显示列标题
    pub show_headers: bool,
    
    /// 编辑器命令
    pub editor: String,
    
    /// 是否使用颜色
    pub use_colors: bool,
    
    /// 命令别名
    pub aliases: std::collections::HashMap<String, String>,
}

impl Default for CliConfig {
    fn default() -> Self {
        Self {
            default_connection: None,
            history_file: dirs::home_dir().map(|p| p.join(".lumosdb_history")),
            output_format: "table".to_string(),
            max_rows: 1000,
            show_timing: true,
            enable_completion: true,
            show_headers: true,
            editor: std::env::var("EDITOR").unwrap_or_else(|_| "nano".to_string()),
            use_colors: true,
            aliases: std::collections::HashMap::new(),
        }
    }
}

impl CliConfig {
    /// 加载配置文件
    pub fn load(config_path: Option<&Path>) -> Result<Self> {
        let config_path = match config_path {
            Some(path) => path.to_path_buf(),
            None => Self::default_config_path()?,
        };
        
        // 如果文件不存在，创建默认配置
        if !config_path.exists() {
            Self::create_default_config(&config_path)?;
        }
        
        // 读取配置文件
        let content = fs::read_to_string(&config_path)?;
        let config: CliConfig = serde_json::from_str(&content)?;
        
        Ok(config)
    }
    
    /// 保存配置到文件
    pub fn save(&self, config_path: Option<&Path>) -> Result<()> {
        let config_path = match config_path {
            Some(path) => path.to_path_buf(),
            None => Self::default_config_path()?,
        };
        
        let content = serde_json::to_string_pretty(self)?;
        fs::write(&config_path, content)?;
        
        Ok(())
    }
    
    /// 获取默认配置文件路径
    fn default_config_path() -> Result<PathBuf> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| anyhow!("无法确定配置目录"))?
            .join("lumosdb");
            
        // 创建配置目录（如果不存在）
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir)?;
        }
        
        Ok(config_dir.join("config.json"))
    }
    
    /// 创建默认配置文件
    fn create_default_config(path: &Path) -> Result<()> {
        // 确保父目录存在
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)?;
            }
        }
        
        let default_config = Self::default();
        let content = serde_json::to_string_pretty(&default_config)?;
        
        let mut file = fs::File::create(path)?;
        file.write_all(content.as_bytes())?;
        
        Ok(())
    }
} 