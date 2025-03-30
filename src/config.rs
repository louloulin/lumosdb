use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::Path;

/// 任务类型
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum JobType {
    Extractor,
    Transformer,
    Loader,
}

/// 任务配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Job {
    /// 任务名称
    pub name: String,
    /// 任务类型
    #[serde(rename = "type")]
    pub job_type: JobType,
    /// 提取器类型
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extractor_type: Option<String>,
    /// 转换器类型
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transformer_type: Option<String>,
    /// 加载器类型
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loader_type: Option<String>,
    /// 可选配置
    #[serde(default)]
    pub options: HashMap<String, Value>,
    /// 下一个任务
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next: Option<String>,
}

/// WebAssembly插件配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WasmPluginConfig {
    /// 是否启用WebAssembly插件
    #[serde(default)]
    pub enabled: bool,
    /// 插件目录
    pub plugins_dir: Option<String>,
    /// 自动加载
    #[serde(default)]
    pub auto_load: bool,
}

/// 配置结构
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
    /// 版本
    pub version: String,
    /// 名称
    pub name: String,
    /// 描述
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// 任务列表
    pub jobs: Vec<Job>,
    /// WebAssembly插件配置
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wasm_plugins: Option<WasmPluginConfig>,
}

impl Config {
    /// 从YAML文件加载配置
    pub fn from_yaml_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        
        if !path.exists() {
            return Err(anyhow!("Config file not found: {:?}", path));
        }
        
        let mut file = File::open(path)?;
        let mut content = String::new();
        file.read_to_string(&mut content)?;
        
        let config: Config = serde_yaml::from_str(&content)?;
        
        Ok(config)
    }
    
    /// 从YAML字符串加载配置
    pub fn from_yaml_str(yaml: &str) -> Result<Self> {
        let config: Config = serde_yaml::from_str(yaml)?;
        Ok(config)
    }
    
    /// 验证配置有效性
    pub fn validate(&self) -> Result<()> {
        // 验证版本
        if self.version.trim().is_empty() {
            return Err(anyhow!("配置缺少版本信息"));
        }
        
        // 验证名称
        if self.name.trim().is_empty() {
            return Err(anyhow!("配置缺少名称信息"));
        }
        
        // 验证任务
        if self.jobs.is_empty() {
            return Err(anyhow!("配置未定义任何任务"));
        }
        
        // 验证任务的类型和配置
        for job in &self.jobs {
            match job.job_type {
                JobType::Extractor => {
                    if job.extractor_type.is_none() {
                        return Err(anyhow!("提取器任务 '{}' 未指定提取器类型", job.name));
                    }
                }
                JobType::Transformer => {
                    if job.transformer_type.is_none() {
                        return Err(anyhow!("转换器任务 '{}' 未指定转换器类型", job.name));
                    }
                }
                JobType::Loader => {
                    if job.loader_type.is_none() {
                        return Err(anyhow!("加载器任务 '{}' 未指定加载器类型", job.name));
                    }
                }
            }
        }
        
        // 验证任务链是否有效
        let mut has_start = false;
        let mut has_end = false;
        
        let job_names: Vec<String> = self.jobs.iter().map(|j| j.name.clone()).collect();
        
        for job in &self.jobs {
            if job.next.is_none() {
                has_end = true;
            } else {
                let next = job.next.as_ref().unwrap();
                if !job_names.contains(next) {
                    return Err(anyhow!("任务 '{}' 指向不存在的下一个任务 '{}'", job.name, next));
                }
            }
            
            // 任务没有被其他任务引用，可能是起始任务
            let is_referenced = self.jobs.iter().any(|j| {
                j.next.as_ref().map_or(false, |n| n == &job.name)
            });
            
            if !is_referenced {
                has_start = true;
            }
        }
        
        if !has_start {
            return Err(anyhow!("配置没有起始任务"));
        }
        
        if !has_end {
            return Err(anyhow!("配置没有结束任务"));
        }
        
        Ok(())
    }
} 