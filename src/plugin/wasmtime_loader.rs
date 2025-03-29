use anyhow::{anyhow, Result};
use log::{debug, error, info, warn};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use wasmtime::*;
use wasmtime_wasi::{WasiCtx, WasiCtxBuilder};
use crate::types::DataRecord;

use serde_json::{json, Value};

// 插件实例
pub struct WasmPluginInstance {
    // 插件名称
    pub name: String,
    // 插件类型
    pub plugin_type: PluginType,
    // 存储模块和实例
    store: Store<PluginState>,
    // 导出的函数和接口
    exports: HashMap<String, Extern>,
}

// 插件类型枚举
#[derive(Debug, Clone, Copy, PartialEq)]
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

// 插件元数据
#[derive(Debug, Clone)]
pub struct PluginMetadata {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
}

// 插件状态，包含WASI上下文和其他需要的状态
struct PluginState {
    wasi: WasiCtx,
    // 可以添加更多状态，如内存、日志等
}

// 插件管理器
pub struct WasmPluginManager {
    // 引擎和链接器
    engine: Engine,
    linker: Linker<PluginState>,
    // 已加载的插件
    plugins: HashMap<String, WasmPluginInstance>,
    // 插件目录
    plugins_dir: PathBuf,
}

impl WasmPluginManager {
    // 创建新的插件管理器
    pub fn new<P: AsRef<Path>>(plugins_dir: P) -> Result<Self> {
        let engine = Engine::default();
        let mut linker = Linker::new(&engine);

        // 设置WASI
        wasmtime_wasi::add_to_linker(&mut linker, |state| &mut state.wasi)?;

        // 添加日志功能
        Self::add_logging(&mut linker)?;

        let plugins_dir = plugins_dir.as_ref().to_path_buf();
        
        // 确保插件目录存在
        if !plugins_dir.exists() {
            std::fs::create_dir_all(&plugins_dir)?;
        }
        
        Ok(Self {
            engine,
            linker,
            plugins: HashMap::new(),
            plugins_dir,
        })
    }

    // 添加日志功能到链接器
    fn add_logging(linker: &mut Linker<PluginState>) -> Result<()> {
        // 调试日志
        linker.func_wrap("logging", "debug", |_ctx: Caller<'_, PluginState>, message: &str| {
            debug!("[Plugin] {}", message);
            Ok(())
        })?;

        // 信息日志
        linker.func_wrap("logging", "info", |_ctx: Caller<'_, PluginState>, message: &str| {
            info!("[Plugin] {}", message);
            Ok(())
        })?;

        // 警告日志
        linker.func_wrap("logging", "warn", |_ctx: Caller<'_, PluginState>, message: &str| {
            warn!("[Plugin] {}", message);
            Ok(())
        })?;

        // 错误日志
        linker.func_wrap("logging", "error", |_ctx: Caller<'_, PluginState>, message: &str| {
            error!("[Plugin] {}", message);
            Ok(())
        })?;

        Ok(())
    }

    // 加载插件
    pub fn load_plugin<P: AsRef<Path>>(&mut self, path: P) -> Result<()> {
        let path = path.as_ref();
        
        // 检查文件是否存在
        if !path.exists() {
            return Err(anyhow!("插件文件不存在: {:?}", path));
        }

        info!("正在加载插件: {:?}", path);
        
        // 编译模块
        let module = Module::from_file(&self.engine, path)?;
        
        // 创建WASI上下文
        let wasi = WasiCtxBuilder::new()
            .inherit_stdio()
            .inherit_args()?
            .build();
        
        // 创建状态
        let state = PluginState { wasi };
        
        // 创建存储
        let mut store = Store::new(&self.engine, state);
        
        // 实例化模块
        let instance = self.linker.instantiate(&mut store, &module)?;
        
        // 收集导出
        let mut exports = HashMap::new();
        for export in instance.exports(&mut store) {
            exports.insert(export.name().to_string(), export.clone());
        }
        
        // 获取元数据
        let get_metadata = instance
            .get_typed_func::<(), (String, String, String, String)>(&mut store, "get-metadata")?;
        
        let (name, version, description, author) = get_metadata.call(&mut store, ())?;
        
        info!("加载插件元数据: {} v{}", name, version);
        
        // 获取插件类型
        let get_type = instance.get_typed_func::<(), i32>(&mut store, "get-type")?;
        let plugin_type_int = get_type.call(&mut store, ())?;
        
        let plugin_type = match plugin_type_int {
            0 => PluginType::Extractor,
            1 => PluginType::Transformer,
            2 => PluginType::Loader,
            _ => PluginType::All,
        };
        
        // 初始化插件
        let init = instance.get_typed_func::<(), ()>(&mut store, "init")?;
        init.call(&mut store, ())?;
        
        // 创建插件实例
        let plugin = WasmPluginInstance {
            name: name.clone(),
            plugin_type,
            store,
            exports,
        };
        
        // 添加到已加载插件
        self.plugins.insert(name, plugin);
        
        info!("插件'{}' v{} 加载成功", name, version);
        Ok(())
    }
    
    // 卸载插件
    pub fn unload_plugin(&mut self, name: &str) -> Result<()> {
        if !self.plugins.contains_key(name) {
            return Err(anyhow!("插件'{}' 未加载", name));
        }
        
        // 获取插件
        let mut plugin = self.plugins.remove(name).unwrap();
        
        // 调用关闭函数
        if let Ok(shutdown) = plugin.get_shutdown() {
            if let Err(e) = shutdown.call(&mut plugin.store, ()) {
                warn!("插件'{}'关闭时发生错误: {}", name, e);
            }
        }
        
        info!("插件'{}' 卸载成功", name);
        Ok(())
    }
    
    // 提取数据
    pub fn extract_data(&mut self, name: &str, options: HashMap<String, Value>) -> Result<Vec<DataRecord>> {
        let plugin = self.plugins.get_mut(name).ok_or_else(|| anyhow!("插件'{}' 未加载", name))?;
        
        if plugin.plugin_type != PluginType::Extractor && plugin.plugin_type != PluginType::All {
            return Err(anyhow!("插件'{}' 不是提取器", name));
        }
        
        // 将选项转换为WIT格式
        let options_str = serde_json::to_string(&options)?;
        
        // 获取提取函数
        let extract = plugin
            .get_extract()
            .map_err(|_| anyhow!("插件'{}' 没有提供extract函数", name))?;
        
        // 调用函数
        let result_str = extract.call(&mut plugin.store, options_str)?;
        
        // 解析结果
        let result: Result<Vec<Value>, String> = serde_json::from_str(&result_str)?;
        
        // 处理结果
        match result {
            Ok(data) => {
                // 转换为DataRecord
                let records = data
                    .into_iter()
                    .map(|v| DataRecord { data: v })
                    .collect();
                Ok(records)
            }
            Err(e) => Err(anyhow!("提取数据失败: {}", e)),
        }
    }
    
    // 加载数据
    pub fn load_data(&mut self, name: &str, records: Vec<DataRecord>, options: HashMap<String, Value>) -> Result<usize> {
        let plugin = self.plugins.get_mut(name).ok_or_else(|| anyhow!("插件'{}' 未加载", name))?;
        
        if plugin.plugin_type != PluginType::Loader && plugin.plugin_type != PluginType::All {
            return Err(anyhow!("插件'{}' 不是加载器", name));
        }
        
        // 将记录转换为WIT格式
        let records_data: Vec<Value> = records.into_iter().map(|r| r.data).collect();
        let records_str = serde_json::to_string(&records_data)?;
        
        // 将选项转换为WIT格式
        let options_str = serde_json::to_string(&options)?;
        
        // 获取加载函数
        let load = plugin
            .get_load()
            .map_err(|_| anyhow!("插件'{}' 没有提供load函数", name))?;
        
        // 调用函数
        let result_str = load.call(&mut plugin.store, (records_str, options_str))?;
        
        // 解析结果
        let result: Result<usize, String> = serde_json::from_str(&result_str)?;
        
        // 处理结果
        match result {
            Ok(count) => Ok(count),
            Err(e) => Err(anyhow!("加载数据失败: {}", e)),
        }
    }
    
    // 转换数据
    pub fn transform_data(&mut self, name: &str, records: Vec<DataRecord>) -> Result<Vec<DataRecord>> {
        let plugin = self.plugins.get_mut(name).ok_or_else(|| anyhow!("插件'{}' 未加载", name))?;
        
        if plugin.plugin_type != PluginType::Transformer && plugin.plugin_type != PluginType::All {
            return Err(anyhow!("插件'{}' 不是转换器", name));
        }
        
        // 将记录转换为WIT格式
        let records_data: Vec<Value> = records.into_iter().map(|r| r.data).collect();
        let records_str = serde_json::to_string(&records_data)?;
        
        // 获取转换函数
        let transform = plugin
            .get_transform()
            .map_err(|_| anyhow!("插件'{}' 没有提供transform函数", name))?;
        
        // 调用函数
        let result_str = transform.call(&mut plugin.store, records_str)?;
        
        // 解析结果
        let data: Vec<Value> = serde_json::from_str(&result_str)?;
        
        // 转换为DataRecord
        let records = data
            .into_iter()
            .map(|v| DataRecord { data: v })
            .collect();
        
        Ok(records)
    }
    
    // 获取所有插件
    pub fn get_all_plugins(&self) -> &HashMap<String, WasmPluginInstance> {
        &self.plugins
    }
    
    // 根据类型获取插件
    pub fn get_plugins_by_type(&self, plugin_type: PluginType) -> HashMap<String, &WasmPluginInstance> {
        self.plugins
            .iter()
            .filter(|(_, plugin)| {
                let p_type = plugin.plugin_type;
                p_type == plugin_type || p_type == PluginType::All || plugin_type == PluginType::All
            })
            .map(|(k, v)| (k.clone(), v))
            .collect()
    }
    
    // 获取特定插件
    pub fn get_plugin(&self, name: &str) -> Option<&WasmPluginInstance> {
        self.plugins.get(name)
    }
    
    // 获取可变特定插件
    pub fn get_plugin_mut(&mut self, name: &str) -> Option<&mut WasmPluginInstance> {
        self.plugins.get_mut(name)
    }
    
    // 加载插件目录中的所有插件
    pub fn load_all_plugins(&mut self) -> usize {
        let dir = &self.plugins_dir;
        if !dir.exists() {
            error!("插件目录不存在: {:?}", dir);
            return 0;
        }
        
        let mut count = 0;
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.filter_map(Result::ok) {
                let path = entry.path();
                
                // 只加载WASM文件
                if path.is_file() && path.extension().map_or(false, |ext| ext == "wasm") {
                    if let Err(e) = self.load_plugin(&path) {
                        error!("加载插件失败 {:?}: {}", path, e);
                    } else {
                        count += 1;
                    }
                }
            }
        } else {
            error!("无法读取插件目录 {:?}", dir);
        }
        
        info!("从目录 {:?} 中加载了 {} 个插件", dir, count);
        count
    }
}

impl WasmPluginInstance {
    // 获取插件元数据
    pub fn metadata(&mut self) -> Result<PluginMetadata> {
        let get_metadata = self.get_get_metadata()?;
        let (name, version, description, author) = get_metadata.call(&mut self.store, ())?;
        
        Ok(PluginMetadata {
            name,
            version,
            description,
            author,
        })
    }
    
    // 获取各种导出函数
    fn get_get_metadata(&self) -> Result<TypedFunc<(), (String, String, String, String)>> {
        self.exports
            .get("get-metadata")
            .ok_or_else(|| anyhow!("插件没有提供get-metadata函数"))?
            .into_func()
            .ok_or_else(|| anyhow!("get-metadata不是一个函数"))?
            .typed(&self.store)
    }
    
    fn get_shutdown(&self) -> Result<TypedFunc<(), ()>> {
        self.exports
            .get("shutdown")
            .ok_or_else(|| anyhow!("插件没有提供shutdown函数"))?
            .into_func()
            .ok_or_else(|| anyhow!("shutdown不是一个函数"))?
            .typed(&self.store)
    }
    
    fn get_extract(&self) -> Result<TypedFunc<String, String>> {
        self.exports
            .get("extract")
            .ok_or_else(|| anyhow!("插件没有提供extract函数"))?
            .into_func()
            .ok_or_else(|| anyhow!("extract不是一个函数"))?
            .typed(&self.store)
    }
    
    fn get_load(&self) -> Result<TypedFunc<(String, String), String>> {
        self.exports
            .get("load")
            .ok_or_else(|| anyhow!("插件没有提供load函数"))?
            .into_func()
            .ok_or_else(|| anyhow!("load不是一个函数"))?
            .typed(&self.store)
    }
    
    fn get_transform(&self) -> Result<TypedFunc<String, String>> {
        self.exports
            .get("transform")
            .ok_or_else(|| anyhow!("插件没有提供transform函数"))?
            .into_func()
            .ok_or_else(|| anyhow!("transform不是一个函数"))?
            .typed(&self.store)
    }
}

// 单例模式管理全局插件管理器
lazy_static::lazy_static! {
    static ref WASM_PLUGIN_MANAGER: Arc<Mutex<Option<WasmPluginManager>>> = Arc::new(Mutex::new(None));
}

// 初始化全局插件管理器
pub fn init_wasm_plugin_manager<P: AsRef<Path>>(plugins_dir: P) -> Result<()> {
    let mut manager = WASM_PLUGIN_MANAGER.lock().unwrap();
    if manager.is_none() {
        *manager = Some(WasmPluginManager::new(plugins_dir)?);
    }
    
    debug!("WASM插件管理器初始化完成");
    Ok(())
}

// 使用插件管理器
pub fn with_wasm_plugin_manager<F, R>(f: F) -> Result<R>
where
    F: FnOnce(&mut WasmPluginManager) -> Result<R>,
{
    let mut manager = WASM_PLUGIN_MANAGER.lock().unwrap();
    if let Some(manager_ref) = manager.as_mut() {
        f(manager_ref)
    } else {
        Err(anyhow!("WASM插件管理器未初始化"))
    }
}

// 查询特定插件是否存在
pub fn has_wasm_plugin(name: &str) -> bool {
    with_wasm_plugin_manager(|manager| Ok(manager.get_plugin(name).is_some())).unwrap_or(false)
} 