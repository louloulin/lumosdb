use actix::prelude::*;
use std::env;
use std::path::Path;
use log::{info, error};
use simple_logger::SimpleLogger;

use lumos_dataflow::config::ETLConfig;
use lumos_dataflow::actors::dag_manager::DAGManagerActor;
use lumos_dataflow::actors::messages::StartDAGExecution;

#[actix_rt::main]
async fn main() -> std::io::Result<()> {
    // 初始化日志
    SimpleLogger::new()
        .with_level(log::LevelFilter::Info)
        .init()
        .unwrap();

    // 获取配置文件路径
    let args: Vec<String> = env::args().collect();
    let config_path = if args.len() > 1 {
        &args[1]
    } else {
        "dataflow/examples/jdbc_etl_config.yaml"
    };

    info!("加载ETL配置文件: {}", config_path);

    // 确认文件存在
    if !Path::new(config_path).exists() {
        error!("配置文件不存在: {}", config_path);
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("配置文件不存在: {}", config_path),
        ));
    }

    // 加载ETL配置
    let config = match ETLConfig::load_from_file(config_path) {
        Ok(config) => {
            info!("成功加载ETL配置: {}", config.name);
            config
        }
        Err(e) => {
            error!("加载ETL配置失败: {:?}", e);
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("加载ETL配置失败: {:?}", e),
            ));
        }
    };

    // 创建DAG管理器
    let dag_manager = DAGManagerActor::new(config.clone()).start();
    info!("DAG管理器已启动");

    // 启动DAG执行
    match dag_manager.send(StartDAGExecution {}).await {
        Ok(result) => match result {
            Ok(execution_id) => {
                info!("成功启动ETL执行, 执行ID: {}", execution_id);
            }
            Err(e) => {
                error!("启动ETL执行失败: {:?}", e);
                return Err(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("启动ETL执行失败: {:?}", e),
                ));
            }
        },
        Err(e) => {
            error!("发送启动命令失败: {:?}", e);
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("发送启动命令失败: {:?}", e),
            ));
        }
    }

    // 等待一段时间让执行完成
    info!("等待ETL执行完成...");
    actix_rt::time::sleep(std::time::Duration::from_secs(5)).await;

    // 关闭系统
    info!("示例完成，关闭系统");
    System::current().stop();
    
    Ok(())
}