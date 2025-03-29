use anyhow::{anyhow, Result};
use clap::{App, AppSettings, Arg, SubCommand};
use log::{error, info};
use lumos_dataflow::plugin::{
    initialize_wasm_plugin_system, list_wasm_plugins, list_wasm_plugins_by_type,
    PluginType, validate_plugin_wit, get_plugin_capabilities,
};
use simple_logger::SimpleLogger;
use std::env;
use std::path::Path;

fn main() -> Result<()> {
    // 初始化日志
    SimpleLogger::new()
        .with_level(log::LevelFilter::Info)
        .init()
        .unwrap();

    // 解析命令行参数
    let matches = App::new("Lumos DataFlow WASM Plugin Manager")
        .version("0.1.0")
        .author("Lumos Team")
        .about("管理WebAssembly插件")
        .setting(AppSettings::SubcommandRequiredElseHelp)
        .subcommand(
            SubCommand::with_name("list")
                .about("列出已加载的插件")
                .arg(
                    Arg::with_name("type")
                        .short("t")
                        .long("type")
                        .value_name("TYPE")
                        .help("过滤插件类型 (extractor, transformer, loader, all)")
                        .takes_value(true),
                ),
        )
        .subcommand(
            SubCommand::with_name("validate")
                .about("验证WebAssembly插件")
                .arg(
                    Arg::with_name("plugin_file")
                        .required(true)
                        .help("WebAssembly插件文件路径"),
                ),
        )
        .subcommand(
            SubCommand::with_name("capabilities")
                .about("显示插件支持的功能")
                .arg(
                    Arg::with_name("plugin_file")
                        .required(true)
                        .help("WebAssembly插件文件路径"),
                ),
        )
        .get_matches();

    // 获取插件目录
    let plugins_dir = env::var("LUMOS_PLUGINS_DIR").unwrap_or_else(|_| {
        let home_dir = dirs::home_dir().expect("无法确定家目录");
        home_dir.join(".lumos/plugins").to_str().unwrap().to_string()
    });

    info!("使用插件目录: {}", plugins_dir);

    // 运行命令
    match matches.subcommand() {
        ("list", Some(sub_matches)) => {
            // 初始化插件系统
            let count = initialize_wasm_plugin_system(&plugins_dir)?;
            info!("已加载 {} 个插件", count);

            // 获取可选的类型筛选
            let filter_type = sub_matches.value_of("type").map(|t| match t {
                "extractor" => PluginType::Extractor,
                "transformer" => PluginType::Transformer,
                "loader" => PluginType::Loader,
                _ => PluginType::All,
            });

            // 列出插件
            if let Some(plugin_type) = filter_type {
                let plugins = list_wasm_plugins_by_type(plugin_type)?;
                info!("类型为 {:?} 的插件:", plugin_type);
                for (i, plugin) in plugins.iter().enumerate() {
                    println!("{}. {}", i + 1, plugin);
                }
            } else {
                let plugins = list_wasm_plugins()?;
                info!("所有插件:");
                for (i, plugin) in plugins.iter().enumerate() {
                    println!("{}. {}", i + 1, plugin);
                }
            }
        }
        ("validate", Some(sub_matches)) => {
            let plugin_file = sub_matches.value_of("plugin_file").unwrap();
            let plugin_path = Path::new(plugin_file);

            if !plugin_path.exists() {
                return Err(anyhow!("插件文件不存在: {}", plugin_file));
            }

            match validate_plugin_wit(plugin_path) {
                Ok(true) => {
                    info!("插件验证成功: {}", plugin_file);
                    println!("✅ 插件 {} 通过验证", plugin_file);
                }
                Ok(false) => {
                    error!("插件验证失败: {}", plugin_file);
                    println!("❌ 插件 {} 验证失败", plugin_file);
                }
                Err(e) => {
                    error!("验证过程出错: {}", e);
                    println!("❌ 验证出错: {}", e);
                    return Err(e);
                }
            }
        }
        ("capabilities", Some(sub_matches)) => {
            let plugin_file = sub_matches.value_of("plugin_file").unwrap();
            let plugin_path = Path::new(plugin_file);

            if !plugin_path.exists() {
                return Err(anyhow!("插件文件不存在: {}", plugin_file));
            }

            match get_plugin_capabilities(plugin_path) {
                Ok(capabilities) => {
                    info!("插件功能: {}", plugin_file);
                    if capabilities.is_empty() {
                        println!("插件没有实现任何功能");
                    } else {
                        println!("插件实现的功能:");
                        for cap in capabilities {
                            println!("- {}", cap);
                        }
                    }
                }
                Err(e) => {
                    error!("获取插件功能失败: {}", e);
                    println!("❌ 出错: {}", e);
                    return Err(e);
                }
            }
        }
        _ => unreachable!(),
    }

    Ok(())
} 