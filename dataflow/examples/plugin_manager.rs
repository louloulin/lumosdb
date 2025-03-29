use std::env;
use std::path::Path;
use clap::{App, Arg, SubCommand};
use log::LevelFilter;
use simple_logger::SimpleLogger;

use lumos_dataflow::plugin::{self, PluginType, init_plugin_manager};
use lumos_dataflow::plugin::cli::{plugin_cli_args, run_plugin_cli};

fn main() {
    // 初始化日志
    SimpleLogger::new()
        .with_level(LevelFilter::Info)
        .init()
        .unwrap();
    
    // 解析命令行参数
    let matches = App::new("Lumos DataFlow 插件管理器")
        .version("0.1.0")
        .author("Lumos DB Team")
        .about("管理 Lumos DataFlow 插件")
        .subcommand(plugin_cli_args())
        .get_matches();
    
    // 获取插件目录
    let plugins_dir = env::var("LUMOS_PLUGINS_DIR")
        .unwrap_or_else(|_| {
            let exe_dir = env::current_exe()
                .map(|path| path.parent().unwrap_or(Path::new(".")).to_path_buf())
                .unwrap_or_else(|_| Path::new(".").to_path_buf());
            
            exe_dir.join("plugins").to_string_lossy().into_owned()
        });
    
    // 初始化插件管理器
    init_plugin_manager(&plugins_dir);
    
    // 运行插件命令
    if let Some(plugin_matches) = matches.subcommand_matches("plugin") {
        match run_plugin_cli(plugin_matches) {
            Ok(_) => {},
            Err(e) => {
                eprintln!("错误: {}", e);
                std::process::exit(1);
            }
        }
    } else {
        println!("使用 --help 查看可用命令");
    }
} 