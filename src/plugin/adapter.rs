use crate::extractors::Extractor;
use crate::loaders::Loader;
use crate::transformers::Transformer;
use crate::types::DataRecord;
use crate::plugin::{
    with_wasm_plugin_manager, PluginType, WasmPluginInstance,
    init_wasm_plugin_manager, has_wasm_plugin
};

use actix::prelude::*;
use anyhow::{anyhow, Result};
use log::{debug, error, info, warn};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use serde_json::Value;

/// WebAssembly插件提取器适配器
pub struct WasmExtractorAdapter {
    // 插件名称
    plugin_name: String,
}

impl WasmExtractorAdapter {
    /// 创建新的WebAssembly提取器适配器
    pub fn new(plugin_name: &str) -> Self {
        Self {
            plugin_name: plugin_name.to_string(),
        }
    }
}

impl Actor for WasmExtractorAdapter {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        info!("WebAssembly extractor adapter started for plugin '{}'", self.plugin_name);
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        debug!("WebAssembly extractor adapter stopped for plugin '{}'", self.plugin_name);
    }
}

#[derive(Message)]
#[rtype(result = "Result<Vec<DataRecord>>")]
pub struct ExtractData {
    pub options: HashMap<String, Value>,
}

impl Handler<ExtractData> for WasmExtractorAdapter {
    type Result = ResponseFuture<Result<Vec<DataRecord>>>;

    fn handle(&mut self, msg: ExtractData, _ctx: &mut Self::Context) -> Self::Result {
        let plugin_name = self.plugin_name.clone();
        let options = msg.options;

        Box::pin(async move {
            with_wasm_plugin_manager(|manager| {
                manager.extract_data(&plugin_name, options)
            })
        })
    }
}

/// WebAssembly插件转换器适配器
pub struct WasmTransformerAdapter {
    // 插件名称
    plugin_name: String,
}

impl WasmTransformerAdapter {
    /// 创建新的WebAssembly转换器适配器
    pub fn new(plugin_name: &str) -> Self {
        Self {
            plugin_name: plugin_name.to_string(),
        }
    }
}

impl Actor for WasmTransformerAdapter {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        info!("WebAssembly transformer adapter started for plugin '{}'", self.plugin_name);
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        debug!("WebAssembly transformer adapter stopped for plugin '{}'", self.plugin_name);
    }
}

#[derive(Message)]
#[rtype(result = "Result<Vec<DataRecord>>")]
pub struct TransformData {
    pub records: Vec<DataRecord>,
}

impl Handler<TransformData> for WasmTransformerAdapter {
    type Result = ResponseFuture<Result<Vec<DataRecord>>>;

    fn handle(&mut self, msg: TransformData, _ctx: &mut Self::Context) -> Self::Result {
        let plugin_name = self.plugin_name.clone();
        let records = msg.records;

        Box::pin(async move {
            with_wasm_plugin_manager(|manager| {
                manager.transform_data(&plugin_name, records)
            })
        })
    }
}

/// WebAssembly插件加载器适配器
pub struct WasmLoaderAdapter {
    // 插件名称
    plugin_name: String,
}

impl WasmLoaderAdapter {
    /// 创建新的WebAssembly加载器适配器
    pub fn new(plugin_name: &str) -> Self {
        Self {
            plugin_name: plugin_name.to_string(),
        }
    }
}

impl Actor for WasmLoaderAdapter {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        info!("WebAssembly loader adapter started for plugin '{}'", self.plugin_name);
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        debug!("WebAssembly loader adapter stopped for plugin '{}'", self.plugin_name);
    }
}

#[derive(Message)]
#[rtype(result = "Result<usize>")]
pub struct LoadData {
    pub records: Vec<DataRecord>,
    pub options: HashMap<String, Value>,
}

impl Handler<LoadData> for WasmLoaderAdapter {
    type Result = ResponseFuture<Result<usize>>;

    fn handle(&mut self, msg: LoadData, _ctx: &mut Self::Context) -> Self::Result {
        let plugin_name = self.plugin_name.clone();
        let records = msg.records;
        let options = msg.options;

        Box::pin(async move {
            with_wasm_plugin_manager(|manager| {
                manager.load_data(&plugin_name, records, options)
            })
        })
    }
}

// 工厂函数，用于创建适当的Actor

/// 创建WebAssembly提取器
pub fn create_wasm_extractor(plugin_name: &str) -> Result<Addr<dyn Extractor>> {
    if !has_wasm_plugin(plugin_name) {
        return Err(anyhow!("WebAssembly plugin '{}' is not loaded", plugin_name));
    }

    // 验证插件类型
    let is_valid = with_wasm_plugin_manager(|manager| {
        let plugin = manager.get_plugin(plugin_name)
            .ok_or_else(|| anyhow!("Plugin not found"))?;
        
        Ok(plugin.plugin_type == PluginType::Extractor || plugin.plugin_type == PluginType::All)
    })?;

    if !is_valid {
        return Err(anyhow!("Plugin '{}' is not an extractor", plugin_name));
    }

    let adapter = WasmExtractorAdapter::new(plugin_name);
    Ok(adapter.start())
}

/// 创建WebAssembly转换器
pub fn create_wasm_transformer(plugin_name: &str) -> Result<Addr<dyn Transformer>> {
    if !has_wasm_plugin(plugin_name) {
        return Err(anyhow!("WebAssembly plugin '{}' is not loaded", plugin_name));
    }

    // 验证插件类型
    let is_valid = with_wasm_plugin_manager(|manager| {
        let plugin = manager.get_plugin(plugin_name)
            .ok_or_else(|| anyhow!("Plugin not found"))?;
        
        Ok(plugin.plugin_type == PluginType::Transformer || plugin.plugin_type == PluginType::All)
    })?;

    if !is_valid {
        return Err(anyhow!("Plugin '{}' is not a transformer", plugin_name));
    }

    let adapter = WasmTransformerAdapter::new(plugin_name);
    Ok(adapter.start())
}

/// 创建WebAssembly加载器
pub fn create_wasm_loader(plugin_name: &str) -> Result<Addr<dyn Loader>> {
    if !has_wasm_plugin(plugin_name) {
        return Err(anyhow!("WebAssembly plugin '{}' is not loaded", plugin_name));
    }

    // 验证插件类型
    let is_valid = with_wasm_plugin_manager(|manager| {
        let plugin = manager.get_plugin(plugin_name)
            .ok_or_else(|| anyhow!("Plugin not found"))?;
        
        Ok(plugin.plugin_type == PluginType::Loader || plugin.plugin_type == PluginType::All)
    })?;

    if !is_valid {
        return Err(anyhow!("Plugin '{}' is not a loader", plugin_name));
    }

    let adapter = WasmLoaderAdapter::new(plugin_name);
    Ok(adapter.start())
}

/// 初始化WebAssembly插件系统
pub fn initialize_wasm_plugin_system<P: AsRef<Path>>(plugins_dir: P) -> Result<usize> {
    // 初始化插件管理器
    init_wasm_plugin_manager(plugins_dir.as_ref())?;
    
    // 加载所有插件
    with_wasm_plugin_manager(|manager| {
        Ok(manager.load_all_plugins())
    })
}

/// 获取已加载的WebAssembly插件列表
pub fn list_wasm_plugins() -> Result<Vec<String>> {
    with_wasm_plugin_manager(|manager| {
        let plugins = manager.get_all_plugins();
        let names: Vec<String> = plugins.keys().cloned().collect();
        Ok(names)
    })
}

/// 按类型获取WebAssembly插件列表
pub fn list_wasm_plugins_by_type(plugin_type: PluginType) -> Result<Vec<String>> {
    with_wasm_plugin_manager(|manager| {
        let plugins = manager.get_plugins_by_type(plugin_type);
        let names: Vec<String> = plugins.keys().cloned().collect();
        Ok(names)
    })
} 