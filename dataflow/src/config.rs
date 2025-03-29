use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use crate::types::{JobConfig, JobStatus, RetryConfig, ETLError};

/// ETL配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ETLConfig {
    pub version: String,
    pub name: String,
    pub description: Option<String>,
    pub jobs: HashMap<String, JobConfig>,
    /// 定义DAG的执行顺序和依赖关系
    pub dag: DAGConfig,
}

/// DAG配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DAGConfig {
    pub name: String,
    pub description: Option<String>,
    /// 定义任务执行顺序
    pub execution_order: Vec<String>,
    /// 定义失败策略
    pub on_failure: FailurePolicy,
}

/// 失败策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FailurePolicy {
    #[serde(rename = "continue")]
    Continue,
    #[serde(rename = "fail")]
    Fail,
    #[serde(rename = "retry")]
    Retry,
}

impl ETLConfig {
    /// 从文件加载配置
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self, ETLError> {
        let path = path.as_ref();
        let mut file = File::open(path)
            .map_err(|e| ETLError::ConfigError(format!("无法打开配置文件: {}", e)))?;
        
        let mut content = String::new();
        file.read_to_string(&mut content)
            .map_err(|e| ETLError::ConfigError(format!("读取配置文件失败: {}", e)))?;
        
        Self::from_yaml(&content)
    }
    
    /// 从YAML字符串解析配置
    pub fn from_yaml(content: &str) -> Result<Self, ETLError> {
        let config: Self = serde_yaml::from_str(content)
            .map_err(|e| ETLError::ConfigError(format!("解析YAML配置失败: {}", e)))?;
            
        // 验证配置有效性
        config.validate()?;
        
        Ok(config)
    }
    
    /// 验证DAG，确保没有循环依赖等问题
    pub fn validate(&self) -> Result<(), ETLError> {
        // 检查任务ID的唯一性
        let mut job_ids = std::collections::HashSet::new();
        for id in self.jobs.keys() {
            if !job_ids.insert(id) {
                return Err(ETLError::ConfigError(format!("重复的任务ID: {}", id)));
            }
        }
        
        // 检查依赖关系，确保所有依赖的任务都存在
        for (job_id, job) in &self.jobs {
            for dep_id in &job.depends_on {
                if !self.jobs.contains_key(dep_id) {
                    return Err(ETLError::DependencyError(
                        format!("任务 {} 依赖不存在的任务: {}", job_id, dep_id)
                    ));
                }
            }
        }
        
        // 检查循环依赖
        if let Err(cycle) = self.detect_cycles() {
            return Err(ETLError::DependencyError(
                format!("检测到循环依赖: {:?}", cycle)
            ));
        }
        
        // 检查执行顺序中的任务都存在
        for job_id in &self.dag.execution_order {
            if !self.jobs.contains_key(job_id) {
                return Err(ETLError::ConfigError(
                    format!("执行顺序中包含不存在的任务: {}", job_id)
                ));
            }
        }
        
        Ok(())
    }
    
    /// 检测DAG中的循环依赖
    fn detect_cycles(&self) -> Result<(), Vec<String>> {
        let mut visited = HashMap::new();
        let mut path = Vec::new();
        
        for job_id in self.jobs.keys() {
            if !visited.contains_key(job_id) {
                if let Err(cycle) = self.dfs_check_cycles(job_id, &mut visited, &mut path) {
                    return Err(cycle);
                }
            }
        }
        
        Ok(())
    }
    
    fn dfs_check_cycles(&self, 
                        job_id: &str, 
                        visited: &mut HashMap<String, bool>, 
                        path: &mut Vec<String>) -> Result<(), Vec<String>> {
        path.push(job_id.to_string());
        visited.insert(job_id.to_string(), true);
        
        if let Some(job) = self.jobs.get(job_id) {
            for dep_id in &job.depends_on {
                if !visited.contains_key(dep_id) {
                    if let Err(cycle) = self.dfs_check_cycles(dep_id, visited, path) {
                        return Err(cycle);
                    }
                } else if *visited.get(dep_id).unwrap() {
                    // 找到循环
                    let mut cycle = Vec::new();
                    let mut found = false;
                    
                    for &id in path.iter().map(|s| s.as_str()) {
                        if id == *dep_id {
                            found = true;
                        }
                        if found {
                            cycle.push(id.to_string());
                        }
                    }
                    cycle.push(dep_id.to_string());
                    
                    return Err(cycle);
                }
            }
        }
        
        visited.insert(job_id.to_string(), false);
        path.pop();
        
        Ok(())
    }
    
    /// 获取任务的拓扑排序
    pub fn get_topological_order(&self) -> Result<Vec<String>, ETLError> {
        let mut result = Vec::new();
        let mut visited = HashMap::new();
        let mut temp_visited = HashMap::new();
        
        for job_id in self.jobs.keys() {
            if !visited.contains_key(job_id) {
                if let Err(err) = self.dfs_topological_sort(job_id, &mut visited, &mut temp_visited, &mut result) {
                    return Err(ETLError::DependencyError(err));
                }
            }
        }
        
        // 结果需要反转，因为DFS是后序遍历
        result.reverse();
        Ok(result)
    }
    
    fn dfs_topological_sort(&self,
                            job_id: &str,
                            visited: &mut HashMap<String, bool>,
                            temp_visited: &mut HashMap<String, bool>,
                            result: &mut Vec<String>) -> Result<(), String> {
        if temp_visited.contains_key(job_id) {
            return Err(format!("检测到循环依赖，无法排序: {}", job_id));
        }
        
        if !visited.contains_key(job_id) {
            temp_visited.insert(job_id.to_string(), true);
            
            if let Some(job) = self.jobs.get(job_id) {
                for dep_id in &job.depends_on {
                    self.dfs_topological_sort(dep_id, visited, temp_visited, result)?;
                }
            }
            
            temp_visited.remove(job_id);
            visited.insert(job_id.to_string(), true);
            result.push(job_id.to_string());
        }
        
        Ok(())
    }
} 