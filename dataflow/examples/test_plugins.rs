use std::env;
use std::path::Path;
use std::collections::HashMap;
use log::{info, error, LevelFilter};
use simple_logger::SimpleLogger;
use serde_json::{json, Value};
use actix_rt::System;

use lumos_dataflow::plugin::{self, init_plugin_manager, with_plugin_manager, PluginType};
use lumos_dataflow::actors::messages::{ExtractData, LoadData};
use lumos_dataflow::types::DataRecord;
use actix::prelude::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化日志
    SimpleLogger::new()
        .with_level(LevelFilter::Debug)
        .init()
        .unwrap();
    
    println!("=== Lumos DataFlow 插件系统测试 ===");
    
    // 获取插件目录
    let plugins_dir = env::var("LUMOS_PLUGINS_DIR")
        .unwrap_or_else(|_| {
            let exe_dir = env::current_exe()
                .map(|path| path.parent().unwrap_or(Path::new(".")).to_path_buf())
                .unwrap_or_else(|_| Path::new(".").to_path_buf());
            
            exe_dir.join("plugins").to_string_lossy().into_owned()
        });
    
    println!("插件目录: {}", plugins_dir);
    
    // 初始化插件管理器
    init_plugin_manager(&plugins_dir);
    
    // 创建Actix系统
    let system = System::new();
    
    system.block_on(async {
        // 验证插件管理器初始化
        println!("\n1. 验证插件管理器初始化");
        match with_plugin_manager(|_| {
            println!("✅ 插件管理器初始化成功");
            true
        }) {
            Some(true) => {},
            _ => {
                println!("❌ 插件管理器初始化失败");
                return;
            }
        }
        
        // 列出所有插件
        println!("\n2. 列出已安装的插件");
        let plugin_count = with_plugin_manager(|manager| {
            let plugins = manager.get_all_plugins();
            println!("找到 {} 个已安装的插件", plugins.len());
            
            for (name, plugin) in plugins {
                let metadata = plugin.instance.metadata();
                println!("- {} v{} ({})", name, metadata.version, metadata.description);
            }
            
            plugins.len()
        }).unwrap_or(0);
        
        if plugin_count == 0 {
            println!("尝试加载MongoDB插件示例...");
            // 查找MongoDB插件示例路径
            let examples_dir = Path::new("examples/plugins/mongodb/target/debug");
            if examples_dir.exists() {
                let plugin_path = examples_dir.join(
                    if cfg!(target_os = "windows") {
                        "lumos_dataflow_plugin_mongodb.dll"
                    } else if cfg!(target_os = "macos") {
                        "liblumos_dataflow_plugin_mongodb.dylib"
                    } else {
                        "liblumos_dataflow_plugin_mongodb.so"
                    }
                );
                
                if plugin_path.exists() {
                    println!("找到MongoDB插件: {:?}", plugin_path);
                    with_plugin_manager(|manager| {
                        match manager.load_plugin(&plugin_path) {
                            Ok(_) => {
                                println!("✅ MongoDB插件加载成功");
                            },
                            Err(e) => {
                                println!("❌ MongoDB插件加载失败: {}", e);
                            }
                        }
                    });
                } else {
                    println!("未找到MongoDB插件，请先构建插件: {:?}", plugin_path);
                    println!("提示: 在 examples/plugins/mongodb 目录运行 'cargo build'");
                }
            } else {
                println!("未找到插件目录: {:?}", examples_dir);
            }
        }
        
        // 再次列出插件
        with_plugin_manager(|manager| {
            let plugins = manager.get_all_plugins();
            if plugins.is_empty() {
                println!("\n⚠️ 没有可用的插件，跳过功能测试");
                return;
            }
            
            println!("\n3. 测试插件功能");
            
            // 遍历并测试每个插件
            for (name, plugin) in plugins {
                let plugin_type = plugin.instance.get_type();
                let metadata = plugin.instance.metadata();
                
                println!("\n测试插件: {} (类型: {:?})", name, plugin_type);
                
                // 测试提取器功能
                if plugin_type == PluginType::Extractor || plugin_type == PluginType::All {
                    println!("测试提取器功能...");
                    
                    // 使用MongoDB插件的示例
                    if name == "mongodb" {
                        // 创建测试Actor
                        let addr = plugin.instance.start();
                        
                        // 创建测试配置
                        let mut options = HashMap::new();
                        options.insert("connection_string".to_string(), json!("mongodb://localhost:27017"));
                        options.insert("database".to_string(), json!("test_db"));
                        options.insert("collection".to_string(), json!("test_collection"));
                        options.insert("limit".to_string(), json!(5));
                        
                        // 发送提取消息
                        match addr.send(ExtractData { options }).await {
                            Ok(result) => {
                                match result {
                                    Ok(records) => {
                                        println!("✅ 提取功能测试成功 (返回 {} 条记录)", records.len());
                                    },
                                    Err(e) => {
                                        println!("⚠️ 提取功能返回错误 (这可能是正常的，如果没有连接到MongoDB): {}", e);
                                    }
                                }
                            },
                            Err(e) => {
                                println!("❌ 提取功能测试失败: {}", e);
                            }
                        }
                    }
                }
                
                // 测试加载器功能
                if plugin_type == PluginType::Loader || plugin_type == PluginType::All {
                    println!("测试加载器功能...");
                    
                    // 使用MongoDB插件的示例
                    if name == "mongodb" {
                        // 创建测试Actor
                        let addr = plugin.instance.start();
                        
                        // 创建测试数据
                        let records = vec![
                            DataRecord::new(json!({
                                "_id": "test1",
                                "name": "测试记录1",
                                "value": 42
                            })),
                            DataRecord::new(json!({
                                "_id": "test2",
                                "name": "测试记录2",
                                "value": 84
                            }))
                        ];
                        
                        // 创建测试配置
                        let mut options = HashMap::new();
                        options.insert("connection_string".to_string(), json!("mongodb://localhost:27017"));
                        options.insert("database".to_string(), json!("test_db"));
                        options.insert("collection".to_string(), json!("test_collection"));
                        options.insert("mode".to_string(), json!("insert"));
                        
                        // 发送加载消息
                        match addr.send(LoadData { records, options }).await {
                            Ok(result) => {
                                match result {
                                    Ok(count) => {
                                        println!("✅ 加载功能测试成功 (加载了 {} 条记录)", count);
                                    },
                                    Err(e) => {
                                        println!("⚠️ 加载功能返回错误 (这可能是正常的，如果没有连接到MongoDB): {}", e);
                                    }
                                }
                            },
                            Err(e) => {
                                println!("❌ 加载功能测试失败: {}", e);
                            }
                        }
                    }
                }
            }
        });
        
        println!("\n4. 插件集成验证");
        
        // 这里可以添加更多集成测试
        
        println!("\n=== 测试完成 ===");
    });
    
    Ok(())
} 