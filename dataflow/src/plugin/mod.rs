//! 插件系统模块
//! 
//! 该模块提供了一个插件系统，允许第三方开发者扩展Lumos-DB的ETL功能
//! 通过实现标准接口，可以添加新的提取器、转换器和加载器

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use log::{info, warn, error, debug};
use std::fs;
use std::sync::{Arc, Mutex, RwLock};
use thiserror::Error;
use libloading::{Library, Symbol};
use serde_json::Value;
use actix::prelude::*;
use lazy_static::lazy_static;
use std::ffi::OsStr;
use anyhow::{anyhow, Result};
use wasmtime::*;

use crate::types::DataRecord;
use crate::actors::messages::{ExtractData, LoadData};

pub mod metadata;
pub use metadata::PluginMetadata;

/// 插件系统错误类型
#[derive(Error, Debug)]
pub enum PluginError {
    #[error("无法加载插件库：{0}")]
    LoadError(String),
    
    #[error("插件库加载失败：{0}")]
    LibraryError(#[from] libloading::Error),
    
    #[error("插件版本不兼容，需要：{0}，实际：{1}")]
    VersionMismatch(String, String),
    
    #[error("插件符号未找到：{0}")]
    SymbolNotFound(String),
    
    #[error("无效的插件元数据")]
    InvalidMetadata,
    
    #[error("IO错误：{0}")]
    IoError(#[from] std::io::Error),
    
    #[error("插件已存在：{0}")]
    PluginAlreadyExists(String),
}

/// 插件类型枚举
#[derive(Debug, PartialEq, Clone, Copy)]
pub enum PluginType {
    Extractor,
    Transformer,
    Loader,
    All,
}

impl std::fmt::Display for PluginType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PluginType::Extractor => write!(f, "extractor"),
            PluginType::Transformer => write!(f, "transformer"),
            PluginType::Loader => write!(f, "loader"),
            PluginType::All => write!(f, "all"),
        }
    }
}

/// 插件接口
pub trait Plugin: Send {
    /// 获取插件元数据
    fn metadata(&self) -> PluginMetadata;
    
    /// 获取插件类型
    fn get_type(&self) -> PluginType;
    
    /// 初始化插件
    fn init(&mut self) -> Result<(), String>;
    
    /// 卸载插件
    fn shutdown(&mut self) -> Result<(), String>;
    
    /// 处理配置参数
    fn process_config(&self, config: HashMap<String, Value>) -> Result<HashMap<String, Value>, String>;
    
    /// 获取插件Actor地址
    fn start(&self) -> Addr<dyn Actor<Context = actix::Context<Self>> + Send> where Self: Actor<Context = actix::Context<Self>>;
}

/// 定义获取插件实例的函数类型
pub type PluginCreateFn = unsafe fn() -> *mut dyn Plugin;

/// 已加载的插件
pub struct LoadedPlugin {
    /// 插件库
    pub library: Library,
    /// 插件实例
    pub instance: Box<dyn Plugin>,
}

/// 插件管理器
pub struct PluginManager {
    /// 已加载的插件
    plugins: HashMap<String, LoadedPlugin>,
    /// 插件目录
    plugins_dir: PathBuf,
}

impl PluginManager {
    /// 创建新的插件管理器
    pub fn new<P: AsRef<Path>>(plugins_dir: P) -> Self {
        let dir = plugins_dir.as_ref().to_path_buf();
        
        // 确保插件目录存在
        if !dir.exists() {
            if let Err(e) = fs::create_dir_all(&dir) {
                error!("无法创建插件目录 {:?}: {}", dir, e);
            }
        }
        
        Self {
            plugins: HashMap::new(),
            plugins_dir: dir,
        }
    }
    
    /// 加载指定路径的插件
    pub fn load_plugin<P: AsRef<Path>>(&mut self, path: P) -> Result<(), PluginError> {
        let path = path.as_ref();
        debug!("加载插件：{:?}", path);
        
        // 检查文件是否存在
        if !path.exists() {
            return Err(PluginError::LoadError(format!("插件文件不存在: {:?}", path)));
        }
        
        info!("正在加载插件: {:?}", path);
        
        // 动态加载库文件
        let library = unsafe {
            match Library::new(path) {
                Ok(lib) => lib,
                Err(e) => return Err(PluginError::LibraryError(e)),
            }
        };
        
        // 获取插件创建函数
        let create_fn: Symbol<unsafe fn() -> Box<dyn Plugin>> = unsafe {
            match library.get(b"create_plugin") {
                Ok(f) => f,
                Err(e) => return Err(PluginError::LoadError(format!("插件没有导出create_plugin函数: {}", e))),
            }
        };
        
        // 创建插件实例
        let instance = unsafe { create_fn() };
        
        // 获取插件元数据
        let metadata = instance.metadata();
        let name = metadata.name.clone();
        
        // 检查是否已存在同名插件
        if self.plugins.contains_key(&name) {
            return Err(PluginError::PluginAlreadyExists(name));
        }
        
        // 添加到已加载插件
        info!("成功加载插件：{} v{}", metadata.name, metadata.version);
        self.plugins.insert(name.clone(), LoadedPlugin {
            library,
            instance,
        });
        
        Ok(())
    }
    
    /// 卸载插件
    pub fn unload_plugin(&mut self, name: &str) -> Result<(), PluginError> {
        debug!("卸载插件：{}", name);
        
        if let Some(mut plugin) = self.plugins.remove(name) {
            if let Err(e) = plugin.instance.shutdown() {
                warn!("插件卸载错误：{}", e);
                // 不返回错误，因为即使shutdown失败，我们也需要卸载它
            }
            
            // 插件会在LoadedPlugin被丢弃时自动关闭库文件
            info!("成功卸载插件：{}", name);
            Ok(())
        } else {
            error!("未找到要卸载的插件：{}", name);
            Err(PluginError::SymbolNotFound(name.to_string()))
        }
    }
    
    /// 加载插件目录中的所有插件
    pub fn load_all_plugins(&mut self) -> usize {
        let dir = &self.plugins_dir;
        if !dir.exists() {
            error!("插件目录不存在: {:?}", dir);
            return 0;
        }
        
        let mut count = 0;
        match std::fs::read_dir(dir) {
            Ok(entries) => {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        
                        // 只加载动态库文件
                        if path.is_file() && Self::is_dynamic_lib(&path) {
                            if let Err(e) = self.load_plugin(&path) {
                                error!("加载插件失败 {:?}: {}", path, e);
                            } else {
                                count += 1;
                            }
                        }
                    }
                }
            }
            Err(e) => {
                error!("无法读取插件目录 {:?}: {}", dir, e);
            }
        }
        
        info!("从目录 {:?} 中加载了 {} 个插件", dir, count);
        count
    }
    
    /// 判断文件是否为动态库
    fn is_dynamic_lib(path: &Path) -> bool {
        if let Some(ext) = path.extension().and_then(OsStr::to_str) {
            #[cfg(target_os = "windows")]
            return ext.eq_ignore_ascii_case("dll");
            
            #[cfg(target_os = "macos")]
            return ext.eq_ignore_ascii_case("dylib");
            
            #[cfg(all(unix, not(target_os = "macos")))]
            return ext.eq_ignore_ascii_case("so");
        }
        false
    }
    
    /// 获取指定类型的所有插件
    pub fn get_plugins_by_type(&self, plugin_type: PluginType) -> HashMap<String, &LoadedPlugin> {
        self.plugins.iter()
            .filter(|(_, plugin)| {
                let p_type = plugin.instance.get_type();
                p_type == plugin_type || p_type == PluginType::All || plugin_type == PluginType::All
            })
            .map(|(k, v)| (k.clone(), v))
            .collect()
    }
    
    /// 获取所有插件
    pub fn get_all_plugins(&self) -> &HashMap<String, LoadedPlugin> {
        &self.plugins
    }
    
    /// 获取特定插件
    pub fn get_plugin(&self, name: &str) -> Option<&LoadedPlugin> {
        self.plugins.get(name)
    }
}

// 单例模式管理全局插件管理器
lazy_static! {
    static ref PLUGIN_MANAGER: RwLock<Option<Arc<Mutex<PluginManager>>>> = RwLock::new(None);
}

/// 初始化全局插件管理器
pub fn init_plugin_manager<P: AsRef<Path>>(plugins_dir: P) {
    let manager = PluginManager::new(plugins_dir);
    let mut lock = PLUGIN_MANAGER.write().unwrap();
    *lock = Some(Arc::new(Mutex::new(manager)));
    
    debug!("插件管理器初始化完成");
}

/// 获取全局插件管理器
pub fn get_plugin_manager() -> Option<Arc<Mutex<PluginManager>>> {
    let lock = PLUGIN_MANAGER.read().unwrap();
    if let Some(manager_arc) = &*lock {
        let manager = manager_arc.lock().unwrap();
        Some(Arc::new(Mutex::new(manager.clone())))
    } else {
        None
    }
}

/// 安全地访问插件管理器执行操作
pub fn with_plugin_manager<F, R>(f: F) -> Option<R>
where
    F: FnOnce(&mut PluginManager) -> R,
{
    let lock = PLUGIN_MANAGER.read().unwrap();
    if let Some(manager_arc) = &*lock {
        let mut manager = manager_arc.lock().unwrap();
        Some(f(&mut manager))
    } else {
        None
    }
}

/// 查询特定插件是否存在
pub fn has_plugin(name: &str) -> bool {
    with_plugin_manager(|manager| manager.get_plugin(name).is_some()).unwrap_or(false)
}

/// 通过插件名称获取Actor地址
pub fn get_plugin_addr<A: Actor>(name: &str) -> Option<Addr<A>> 
where
    A: Actor<Context = Context<A>> + Send,
{
    None // 在实际实现中，这里需要根据插件类型创建并返回对应Actor的地址
}

// CLI命令模块
pub mod cli;

// 导出模块
pub use self::cli::handle_plugin_command;

// 基本的wasmtime加载器
pub mod wasmtime_loader {
    use anyhow::{anyhow, Result};
    use log::{debug, info};
    use std::path::Path;
    use wasmtime::*;

    /// 验证WebAssembly模块是否可用
    pub fn validate_wasm<P: AsRef<Path>>(path: P) -> Result<bool> {
        let path = path.as_ref();
        if !path.exists() {
            return Err(anyhow!("WebAssembly文件不存在: {:?}", path));
        }

        info!("验证WebAssembly模块: {:?}", path);
        
        // 创建引擎
        let engine = Engine::default();
        
        // 编译模块
        let module = Module::from_file(&engine, path)?;
        
        // 创建存储
        let mut store = Store::new(&engine, ());
        
        // 创建链接器
        let linker = Linker::new(&engine);
        
        // 实例化模块
        let instance = linker.instantiate(&mut store, &module)?;
        
        debug!("WebAssembly模块加载成功");
        
        Ok(true)
    }

    /// 初始化WebAssembly插件系统
    pub fn initialize_wasm_plugin_system<P: AsRef<Path>>(plugins_dir: P) -> Result<usize> {
        let dir = plugins_dir.as_ref();
        
        if !dir.exists() {
            std::fs::create_dir_all(dir)?;
            info!("创建插件目录: {:?}", dir);
        }
        
        info!("WebAssembly插件系统初始化成功");
        Ok(0)
    }
}

// 重新导出基本功能
pub use wasmtime_loader::*; 