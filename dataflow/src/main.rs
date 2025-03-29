use actix::Actor;
use log::{info, error, warn};
use env_logger::Env;
use std::path::Path;
use std::fs::File;
use std::io::Read;
use std::process;
use structopt::StructOpt;

use lumos_dataflow::config::ETLConfig;
use lumos_dataflow::actors::dag_manager::DAGManagerActor;
use lumos_dataflow::api::start_api_server;

/// ETL数据流程引擎
#[derive(StructOpt, Debug)]
#[structopt(name = "lumos-dataflow")]
struct Cli {
    /// 配置文件路径
    #[structopt(short, long, parse(from_os_str))]
    config: Option<std::path::PathBuf>,
    
    /// 主机地址，默认为127.0.0.1
    #[structopt(short, long, default_value = "127.0.0.1")]
    host: String,
    
    /// 服务端口，默认为8085
    #[structopt(short, long, default_value = "8085")]
    port: u16,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 初始化日志
    env_logger::init_from_env(Env::default().default_filter_or("info"));
    
    // 解析命令行参数
    let args = Cli::from_args();
    
    info!("启动 Lumos Dataflow 引擎...");
    
    // 加载配置文件
    let config = if let Some(config_path) = args.config {
        info!("从配置文件加载DAG配置: {:?}", config_path);
        
        match load_config_from_file(&config_path) {
            Ok(config) => Some(config),
            Err(e) => {
                error!("加载配置文件失败: {}", e);
                None
            }
        }
    } else {
        warn!("未指定配置文件，使用默认或通过API配置");
        None
    };
    
    // 创建DAG管理器Actor
    let dag_manager = if let Some(cfg) = config {
        match DAGManagerActor::new(cfg) {
            Ok(actor) => actor.start(),
            Err(e) => {
                error!("创建DAG管理器失败: {}", e);
                process::exit(1);
            }
        }
    } else {
        // 创建一个空的DAG管理器，等待通过API配置
        match DAGManagerActor::with_empty_config() {
            Ok(actor) => actor.start(),
            Err(e) => {
                error!("创建DAG管理器失败: {}", e);
                process::exit(1);
            }
        }
    };
    
    // 启动API服务器
    info!("启动API服务器 - {}:{}", args.host, args.port);
    start_api_server(dag_manager, &args.host, args.port).await
}

/// 从文件加载ETL配置
fn load_config_from_file<P: AsRef<Path>>(path: P) -> Result<ETLConfig, String> {
    // 打开文件
    let mut file = match File::open(&path) {
        Ok(file) => file,
        Err(e) => return Err(format!("无法打开配置文件: {}", e)),
    };
    
    // 读取文件内容
    let mut contents = String::new();
    if let Err(e) = file.read_to_string(&mut contents) {
        return Err(format!("读取配置文件失败: {}", e));
    }
    
    // 解析YAML
    ETLConfig::from_yaml(&contents)
} 