//! 插件CLI工具
//!
//! 该模块提供了用于管理插件的命令行工具

use clap::{App, AppSettings, Arg, ArgMatches, SubCommand};
use std::path::Path;
use log::{info, error};
use crate::plugin::{PluginManager, with_plugin_manager, PluginType};

/// 处理插件相关命令
pub fn handle_plugin_command(matches: &ArgMatches) -> Result<(), String> {
    match matches.subcommand() {
        ("list", Some(sub_m)) => list_plugins(sub_m),
        ("install", Some(sub_m)) => install_plugin(sub_m),
        ("uninstall", Some(sub_m)) => uninstall_plugin(sub_m),
        ("info", Some(sub_m)) => show_plugin_info(sub_m),
        _ => Err("未知的插件命令".to_string()),
    }
}

/// 列出已安装的插件
fn list_plugins(matches: &ArgMatches) -> Result<(), String> {
    let type_filter = matches.value_of("type").map(|t| match t {
        "extractor" => PluginType::Extractor,
        "transformer" => PluginType::Transformer,
        "loader" => PluginType::Loader,
        _ => PluginType::All,
    }).unwrap_or(PluginType::All);
    
    with_plugin_manager(|manager| {
        let plugins = if type_filter == PluginType::All {
            manager.get_all_plugins()
        } else {
            manager.get_plugins_by_type(type_filter)
        };
        
        println!("已安装的插件 (类型: {}):", type_filter);
        if plugins.is_empty() {
            println!("  没有已安装的插件");
            return Ok(());
        }
        
        for (name, plugin) in plugins {
            let metadata = plugin.instance.metadata();
            println!("- {} v{} ({})", name, metadata.version, metadata.description);
        }
        
        Ok(())
    }).unwrap_or(Err("插件管理器未初始化".to_string()))
}

/// 安装插件
fn install_plugin(matches: &ArgMatches) -> Result<(), String> {
    let path = matches.value_of("path").unwrap();
    
    with_plugin_manager(|manager| {
        match manager.load_plugin(path) {
            Ok(_) => {
                println!("插件安装成功");
                Ok(())
            },
            Err(e) => Err(format!("插件安装失败: {}", e)),
        }
    }).unwrap_or(Err("插件管理器未初始化".to_string()))
}

/// 卸载插件
fn uninstall_plugin(matches: &ArgMatches) -> Result<(), String> {
    let name = matches.value_of("name").unwrap();
    
    with_plugin_manager(|manager| {
        match manager.unload_plugin(name) {
            Ok(_) => {
                println!("插件'{}'卸载成功", name);
                Ok(())
            },
            Err(e) => Err(format!("插件卸载失败: {}", e)),
        }
    }).unwrap_or(Err("插件管理器未初始化".to_string()))
}

/// 显示插件信息
fn show_plugin_info(matches: &ArgMatches) -> Result<(), String> {
    let name = matches.value_of("name").unwrap();
    
    with_plugin_manager(|manager| {
        match manager.get_plugin(name) {
            Some(plugin) => {
                let metadata = plugin.instance.metadata();
                let plugin_type = plugin.instance.get_type();
                
                println!("插件信息:");
                println!("  名称: {}", metadata.name);
                println!("  版本: {}", metadata.version);
                println!("  描述: {}", metadata.description);
                println!("  作者: {}", metadata.author);
                println!("  类型: {}", plugin_type);
                
                Ok(())
            },
            None => Err(format!("插件'{}'未找到", name)),
        }
    }).unwrap_or(Err("插件管理器未初始化".to_string()))
}

/// 创建插件相关命令
pub fn create_plugin_command<'a, 'b>() -> App<'a, 'b> {
    SubCommand::with_name("plugin")
        .about("插件管理")
        .setting(AppSettings::SubcommandRequiredElseHelp)
        .subcommand(
            SubCommand::with_name("list")
                .about("列出所有已安装的插件")
                .arg(
                    Arg::with_name("type")
                        .short("t")
                        .long("type")
                        .value_name("TYPE")
                        .help("按类型过滤 (extractor, transformer, loader)")
                        .takes_value(true)
                )
        )
        .subcommand(
            SubCommand::with_name("install")
                .about("安装插件")
                .arg(
                    Arg::with_name("path")
                        .help("插件文件路径")
                        .required(true)
                        .index(1)
                )
        )
        .subcommand(
            SubCommand::with_name("uninstall")
                .about("卸载插件")
                .arg(
                    Arg::with_name("name")
                        .help("插件名称")
                        .required(true)
                        .index(1)
                )
        )
        .subcommand(
            SubCommand::with_name("info")
                .about("显示插件信息")
                .arg(
                    Arg::with_name("name")
                        .help("插件名称")
                        .required(true)
                        .index(1)
                )
        )
} 