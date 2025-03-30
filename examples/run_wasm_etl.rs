use anyhow::{anyhow, Result};
use log::{debug, error, info};
use lumos_dataflow::actors::pipeline::PipelineActor;
use lumos_dataflow::config::Config;
use lumos_dataflow::plugin::{initialize_wasm_plugin_system};
use simple_logger::SimpleLogger;
use std::env;
use std::path::Path;

#[actix_rt::main]
async fn main() -> Result<()> {
    // 配置日志
    SimpleLogger::new()
        .with_level(log::LevelFilter::Info)
        .init()
        .unwrap();

    // 获取配置文件路径
    let args: Vec<String> = env::args().collect();
    let config_path = args.get(1).ok_or_else(|| {
        anyhow!("请提供配置文件路径，例如: cargo run --example run_wasm_etl examples/configs/mongodb_wasm_plugin.yaml")
    })?;

    info!("使用配置文件: {}", config_path);

    // 加载配置
    let config = Config::from_yaml_file(config_path)?;
    info!("成功加载配置: {}", config.name);

    // 初始化WebAssembly插件系统
    if let Some(wasm_config) = &config.wasm_plugins {
        if wasm_config.enabled {
            let plugins_dir = wasm_config.plugins_dir.as_deref().unwrap_or("./plugins");
            info!("正在初始化WebAssembly插件系统，插件目录: {}", plugins_dir);
            
            let count = initialize_wasm_plugin_system(plugins_dir)?;
            info!("已加载 {} 个WebAssembly插件", count);
        }
    }

    // 创建并启动管道
    info!("正在创建数据处理管道...");
    let pipeline = PipelineActor::new(config);
    let pipeline_addr = pipeline.start();

    // 执行管道
    info!("开始执行数据处理...");
    let result = pipeline_addr.send(lumos_dataflow::actors::messages::InitializeAndRun).await??;

    // 处理结果
    match result {
        Ok(stats) => {
            info!("数据处理完成！");
            info!("处理统计: {:#?}", stats);
        }
        Err(e) => {
            error!("数据处理失败: {}", e);
            return Err(anyhow!("数据处理失败: {}", e));
        }
    }

    info!("ETL流程执行完毕");
    Ok(())
} 