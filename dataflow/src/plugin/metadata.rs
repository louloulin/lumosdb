//! 插件元数据定义
//!
//! 该模块定义了插件的元数据结构和版本管理

use std::fmt;
use serde::{Deserialize, Serialize};
use semver::Version;

/// 插件元数据
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PluginMetadata {
    /// 插件名称
    pub name: String,
    
    /// 插件版本
    pub version: String,
    
    /// 插件描述
    pub description: String,
    
    /// 插件作者
    pub author: String,
    
    /// 插件主页
    pub homepage: Option<String>,
    
    /// 插件仓库地址
    pub repository: Option<String>,
    
    /// 支持的最低Lumos-DB版本
    pub min_framework_version: String,
    
    /// 插件支持的特性
    pub features: Vec<String>,
    
    /// 插件许可证
    pub license: Option<String>,
}

impl PluginMetadata {
    /// 创建新的插件元数据
    pub fn new(
        name: impl Into<String>,
        version: impl Into<String>,
        description: impl Into<String>,
        author: impl Into<String>,
        min_framework_version: impl Into<String>,
    ) -> Self {
        Self {
            name: name.into(),
            version: version.into(),
            description: description.into(),
            author: author.into(),
            min_framework_version: min_framework_version.into(),
            homepage: None,
            repository: None,
            features: Vec::new(),
            license: None,
        }
    }
    
    /// 检查版本兼容性
    pub fn check_compatibility(&self, framework_version: &str) -> Result<(), VersionError> {
        let plugin_min_version = Version::parse(&self.min_framework_version)
            .map_err(|_| VersionError::InvalidVersion(self.min_framework_version.clone()))?;
            
        let current_version = Version::parse(framework_version)
            .map_err(|_| VersionError::InvalidVersion(framework_version.to_string()))?;
            
        if current_version < plugin_min_version {
            return Err(VersionError::IncompatibleVersion(
                framework_version.to_string(),
                self.min_framework_version.clone(),
            ));
        }
        
        Ok(())
    }
    
    /// 添加特性
    pub fn with_feature(mut self, feature: impl Into<String>) -> Self {
        self.features.push(feature.into());
        self
    }
    
    /// 设置主页
    pub fn with_homepage(mut self, homepage: impl Into<String>) -> Self {
        self.homepage = Some(homepage.into());
        self
    }
    
    /// 设置仓库
    pub fn with_repository(mut self, repository: impl Into<String>) -> Self {
        self.repository = Some(repository.into());
        self
    }
    
    /// 设置许可证
    pub fn with_license(mut self, license: impl Into<String>) -> Self {
        self.license = Some(license.into());
        self
    }
}

impl fmt::Display for PluginMetadata {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "插件：{} v{}", self.name, self.version)?;
        writeln!(f, "描述：{}", self.description)?;
        writeln!(f, "作者：{}", self.author)?;
        
        if let Some(homepage) = &self.homepage {
            writeln!(f, "主页：{}", homepage)?;
        }
        
        if let Some(repository) = &self.repository {
            writeln!(f, "仓库：{}", repository)?;
        }
        
        if !self.features.is_empty() {
            writeln!(f, "特性：{}", self.features.join(", "))?;
        }
        
        if let Some(license) = &self.license {
            writeln!(f, "许可证：{}", license)?;
        }
        
        Ok(())
    }
}

/// 版本错误
#[derive(Debug, thiserror::Error)]
pub enum VersionError {
    #[error("无效的版本格式：{0}")]
    InvalidVersion(String),
    
    #[error("版本不兼容，当前版本：{0}，需要版本：{1}")]
    IncompatibleVersion(String, String),
}

/// 当前框架版本
pub const FRAMEWORK_VERSION: &str = env!("CARGO_PKG_VERSION"); 