use anyhow::{anyhow, Result};
use log::{debug, error, warn};
use std::path::Path;
use wasmtime::*;

/// 验证WASM模块是否符合我们的WIT接口要求
pub fn validate_plugin_wit<P: AsRef<Path>>(path: P) -> Result<bool> {
    let path = path.as_ref();
    if !path.exists() {
        return Err(anyhow!("Plugin file does not exist: {:?}", path));
    }

    debug!("Validating WIT interface for plugin: {:?}", path);

    // 创建引擎
    let engine = Engine::default();
    
    // 编译模块
    let module = Module::from_file(&engine, path)?;
    
    // 检查必要的导出
    let mut missing_exports = Vec::new();
    
    // 必需的核心函数
    let required_exports = [
        "get-metadata",
        "get-type",
        "init",
        "shutdown"
    ];
    
    // 检查核心函数
    for export in &required_exports {
        if !module.exports().any(|e| e.name() == *export) {
            missing_exports.push(*export);
        }
    }
    
    // 根据不同类型的插件检查特定功能
    let has_extract = module.exports().any(|e| e.name() == "extract");
    let has_transform = module.exports().any(|e| e.name() == "transform");
    let has_load = module.exports().any(|e| e.name() == "load");
    
    // 如果没有任何功能，这个插件并不实用
    if !has_extract && !has_transform && !has_load {
        warn!("Plugin does not implement any functionality (extract/transform/load)");
        return Ok(false);
    }
    
    // 检查是否缺少必需的核心函数
    if !missing_exports.is_empty() {
        error!(
            "Plugin is missing required exports: {}",
            missing_exports.join(", ")
        );
        return Ok(false);
    }
    
    // 验证导出函数的签名类型
    // 在实际实现中，我们应该使用wit-bindgen提供的功能进行更详细的验证
    // 但这里我们先做一个基本的检查
    
    debug!("Plugin passed basic WIT interface validation");
    Ok(true)
}

/// 获取插件支持的功能列表
pub fn get_plugin_capabilities<P: AsRef<Path>>(path: P) -> Result<Vec<String>> {
    let path = path.as_ref();
    if !path.exists() {
        return Err(anyhow!("Plugin file does not exist: {:?}", path));
    }

    // 创建引擎
    let engine = Engine::default();
    
    // 编译模块
    let module = Module::from_file(&engine, path)?;
    
    let mut capabilities = Vec::new();
    
    // 检查模块实现了哪些功能
    if module.exports().any(|e| e.name() == "extract") {
        capabilities.push("extractor".to_string());
    }
    
    if module.exports().any(|e| e.name() == "transform") {
        capabilities.push("transformer".to_string());
    }
    
    if module.exports().any(|e| e.name() == "load") {
        capabilities.push("loader".to_string());
    }
    
    Ok(capabilities)
} 