use anyhow::{anyhow, Result};
use log::{error, info};
use lumos_dataflow::plugin::{validate_plugin_wit, get_plugin_capabilities};
use simple_logger::SimpleLogger;
use std::env;
use std::path::Path;

fn main() -> Result<()> {
    // 初始化日志
    SimpleLogger::new()
        .with_level(log::LevelFilter::Info)
        .init()
        .unwrap();

    // 获取命令行参数
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        return Err(anyhow!("请提供WebAssembly插件文件路径作为参数"));
    }

    let plugin_path = Path::new(&args[1]);
    if !plugin_path.exists() {
        return Err(anyhow!("插件文件不存在: {:?}", plugin_path));
    }

    info!("开始验证WebAssembly插件: {:?}", plugin_path);

    // 验证插件
    match validate_plugin_wit(plugin_path) {
        Ok(true) => {
            info!("✅ 插件验证成功: {:?}", plugin_path);
            
            // 获取插件功能
            match get_plugin_capabilities(plugin_path) {
                Ok(capabilities) => {
                    info!("插件支持的功能:");
                    if capabilities.is_empty() {
                        println!("插件没有实现任何功能");
                    } else {
                        for cap in capabilities {
                            println!("- {}", cap);
                        }
                    }
                }
                Err(e) => {
                    error!("获取插件功能失败: {}", e);
                }
            }
        }
        Ok(false) => {
            error!("❌ 插件验证失败: {:?}", plugin_path);
        }
        Err(e) => {
            error!("验证过程出错: {}", e);
            return Err(e);
        }
    }

    Ok(())
} 