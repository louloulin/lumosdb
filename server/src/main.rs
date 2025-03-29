use std::process;
use env_logger::Env;
use log::{info, error};

mod api;
mod db;
mod middleware;
mod models;
mod utils;
mod config;

use crate::config::ServerConfig;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 初始化日志系统
    let config = ServerConfig::from_env();
    let env = Env::default()
        .filter_or("RUST_LOG", &config.log_level);
    env_logger::init_from_env(env);
    
    info!("Starting Lumos-DB Server");
    
    // 启动服务器
    if let Err(e) = api::rest::run_server(config).await {
        error!("Server error: {}", e);
        process::exit(1);
    }
    
    info!("Server shutdown complete");
    Ok(())
}
