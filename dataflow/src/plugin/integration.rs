//! 插件集成模块
//!
//! 该模块提供了将插件系统与ETL框架集成的功能

use std::collections::HashMap;
use actix::prelude::*;
use log::{info, warn, error, debug};
use serde_json::Value;

use crate::types::ETLError;
use crate::plugin::{PluginType, with_plugin_manager};
use crate::extractors::factory as extractor_factory;
use crate::transformers::factory as transformer_factory;
use crate::loaders::factory as loader_factory;

/// 创建插件提取器
pub fn create_plugin_extractor(extractor_type: &str, options: HashMap<String, Value>) -> Result<Addr<dyn Actor>, ETLError> {
    debug!("尝试从插件创建提取器：{}", extractor_type);
    
    // 先检查是否有匹配的插件
    let plugin_result = with_plugin_manager(|manager| {
        for plugin in manager.get_plugins_by_type(PluginType::Extractor) {
            let metadata = plugin.instance.metadata();
            let plugin_id = format!("plugin:{}", metadata.name);
            
            if extractor_type == plugin_id || extractor_type == metadata.name {
                debug!("找到匹配的提取器插件：{}", metadata.name);
                
                // 处理配置
                let processed_options = match plugin.instance.process_config(options.clone()) {
                    Ok(opts) => opts,
                    Err(e) => {
                        error!("插件配置处理失败：{}", e);
                        return Err(ETLError::ConfigError(format!("插件配置处理失败：{}", e)));
                    }
                };
                
                // 这里应集成插件的Actor，但简化为示例
                info!("使用插件 '{}' 创建提取器", metadata.name);
                
                // 这里应该是实际的插件调用
                // 为简化示例，我们假设插件直接返回一个结果
                return Ok(dummy_plugin_actor_addr());
            }
        }
        
        Err(ETLError::ConfigError(format!("未找到提取器插件：{}", extractor_type)))
    });
    
    // 如果没有找到插件或插件管理器未初始化，回退到内置工厂
    match plugin_result {
        Some(result) => result,
        None => {
            debug!("未找到匹配的提取器插件，回退到内置工厂");
            extractor_factory::create_extractor(extractor_type, options)
        }
    }
}

/// 创建插件转换器
pub fn create_plugin_transformer(transformer_type: &str, options: HashMap<String, Value>) -> Result<Addr<dyn Actor>, ETLError> {
    debug!("尝试从插件创建转换器：{}", transformer_type);
    
    // 先检查是否有匹配的插件
    let plugin_result = with_plugin_manager(|manager| {
        for plugin in manager.get_plugins_by_type(PluginType::Transformer) {
            let metadata = plugin.instance.metadata();
            let plugin_id = format!("plugin:{}", metadata.name);
            
            if transformer_type == plugin_id || transformer_type == metadata.name {
                debug!("找到匹配的转换器插件：{}", metadata.name);
                
                // 处理配置
                let processed_options = match plugin.instance.process_config(options.clone()) {
                    Ok(opts) => opts,
                    Err(e) => {
                        error!("插件配置处理失败：{}", e);
                        return Err(ETLError::ConfigError(format!("插件配置处理失败：{}", e)));
                    }
                };
                
                // 这里应集成插件的Actor，但简化为示例
                info!("使用插件 '{}' 创建转换器", metadata.name);
                
                // 这里应该是实际的插件调用
                // 为简化示例，我们假设插件直接返回一个结果
                return Ok(dummy_plugin_actor_addr());
            }
        }
        
        Err(ETLError::ConfigError(format!("未找到转换器插件：{}", transformer_type)))
    });
    
    // 如果没有找到插件或插件管理器未初始化，回退到内置工厂
    match plugin_result {
        Some(result) => result,
        None => {
            debug!("未找到匹配的转换器插件，回退到内置工厂");
            transformer_factory::create_transformer(transformer_type, options)
        }
    }
}

/// 创建插件加载器
pub fn create_plugin_loader(loader_type: &str, options: HashMap<String, Value>) -> Result<Addr<dyn Actor>, ETLError> {
    debug!("尝试从插件创建加载器：{}", loader_type);
    
    // 先检查是否有匹配的插件
    let plugin_result = with_plugin_manager(|manager| {
        for plugin in manager.get_plugins_by_type(PluginType::Loader) {
            let metadata = plugin.instance.metadata();
            let plugin_id = format!("plugin:{}", metadata.name);
            
            if loader_type == plugin_id || loader_type == metadata.name {
                debug!("找到匹配的加载器插件：{}", metadata.name);
                
                // 处理配置
                let processed_options = match plugin.instance.process_config(options.clone()) {
                    Ok(opts) => opts,
                    Err(e) => {
                        error!("插件配置处理失败：{}", e);
                        return Err(ETLError::ConfigError(format!("插件配置处理失败：{}", e)));
                    }
                };
                
                // 这里应集成插件的Actor，但简化为示例
                info!("使用插件 '{}' 创建加载器", metadata.name);
                
                // 这里应该是实际的插件调用
                // 为简化示例，我们假设插件直接返回一个结果
                return Ok(dummy_plugin_actor_addr());
            }
        }
        
        Err(ETLError::ConfigError(format!("未找到加载器插件：{}", loader_type)))
    });
    
    // 如果没有找到插件或插件管理器未初始化，回退到内置工厂
    match plugin_result {
        Some(result) => result,
        None => {
            debug!("未找到匹配的加载器插件，回退到内置工厂");
            loader_factory::create_loader(loader_type, options)
        }
    }
}

/// 初始化插件工厂
pub fn init_plugin_factories() {
    // 覆盖工厂方法
    // 注意：这是一个示例，实际代码需要更加复杂的工厂覆盖机制
    info!("初始化插件工厂");
    
    // 这里应该设置工厂方法
    // 实际的实现需要更复杂的机制来替换工厂方法
}

// 仅用于演示的虚拟Actor地址
fn dummy_plugin_actor_addr() -> Addr<dyn Actor> {
    // 在实际代码中，这里应该返回一个真实的Actor地址
    struct DummyActor;
    
    impl Actor for DummyActor {
        type Context = Context<Self>;
    }
    
    DummyActor.start()
} 