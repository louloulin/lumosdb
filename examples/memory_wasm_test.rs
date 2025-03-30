use anyhow::{anyhow, Result};
use log::*;
use serde_json::json;
use lumos_dataflow::plugin::initialize_wasm_plugin_system;
use lumos_dataflow::plugin::with_wasm_plugin_manager;
use lumos_dataflow::types::DataRecord;
use simple_logger::SimpleLogger;
use std::collections::HashMap;

#[actix_rt::main]
async fn main() -> Result<()> {
    // 配置日志
    SimpleLogger::new()
        .with_level(log::LevelFilter::Info)
        .init()
        .unwrap();

    info!("开始WebAssembly插件内存测试");

    // 初始化WASM插件系统
    let plugins_dir = "./plugins";
    info!("初始化WebAssembly插件系统，目录: {}", plugins_dir);
    
    let count = initialize_wasm_plugin_system(plugins_dir)?;
    info!("已加载 {} 个WebAssembly插件", count);

    // 展示已加载的插件
    let plugin_names = with_wasm_plugin_manager(|manager| {
        let plugins = manager.get_all_plugins();
        let names: Vec<String> = plugins.keys().cloned().collect();
        Ok(names)
    })?;

    if plugin_names.is_empty() {
        error!("没有加载任何插件，请先构建MongoDB插件");
        error!("使用命令: ./scripts/build_wasm_plugin.sh examples/plugins/mongodb");
        return Err(anyhow!("没有加载任何插件"));
    }

    info!("已加载的插件: {:?}", plugin_names);

    // 使用MongoDB插件 - 提取
    if plugin_names.contains(&"mongodb".to_string()) {
        info!("测试MongoDB插件提取功能");
        
        // 创建提取选项
        let mut options = HashMap::new();
        options.insert("connection_string".to_string(), json!("mongodb://localhost:27017"));
        options.insert("database".to_string(), json!("test_db"));
        options.insert("collection".to_string(), json!("test_collection"));
        options.insert("limit".to_string(), json!(5));
        
        // 提取数据
        let records = with_wasm_plugin_manager(|manager| {
            manager.extract_data("mongodb", options)
        })?;
        
        info!("从MongoDB提取了 {} 条记录", records.len());
        info!("示例记录: {:?}", records.first());
        
        // 转换数据
        let transformed_records = with_wasm_plugin_manager(|manager| {
            manager.transform_data("mongodb", records.clone())
        })?;
        
        info!("转换了 {} 条记录", transformed_records.len());
        info!("转换后示例记录: {:?}", transformed_records.first());
        
        // 加载数据
        let mut load_options = HashMap::new();
        load_options.insert("connection_string".to_string(), json!("mongodb://localhost:27017"));
        load_options.insert("database".to_string(), json!("test_output_db"));
        load_options.insert("collection".to_string(), json!("test_output_collection"));
        load_options.insert("mode".to_string(), json!("replace"));
        
        let loaded_count = with_wasm_plugin_manager(|manager| {
            manager.load_data("mongodb", transformed_records, load_options)
        })?;
        
        info!("加载了 {} 条记录到MongoDB", loaded_count);
    } else {
        warn!("MongoDB插件未加载，跳过测试");
    }

    info!("WebAssembly插件内存测试完成");
    Ok(())
} 