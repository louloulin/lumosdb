use std::path::Path;
use log::*;
use simple_logger::SimpleLogger;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 配置日志
    SimpleLogger::new()
        .with_level(log::LevelFilter::Info)
        .init()
        .unwrap();

    info!("WebAssembly插件简单测试");

    // 检查插件目录是否存在
    let plugins_dir = Path::new("./plugins");
    if !plugins_dir.exists() {
        info!("创建插件目录");
        std::fs::create_dir_all(plugins_dir)?;
    }

    // 检查我们是否能够使用Wasmtime
    info!("验证Wasmtime可用性");
    let engine = wasmtime::Engine::default();
    info!("Wasmtime引擎创建成功！");

    info!("系统验证成功！");
    Ok(())
} 