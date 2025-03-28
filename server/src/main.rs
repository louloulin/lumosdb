mod api;
mod db;
mod utils;
mod config;
mod models;
mod middleware;

use actix_web::{web, App, HttpServer, middleware as actix_middleware};
use actix_cors::Cors;
use std::sync::Arc;
use std::io;
use std::env;
use std::path::PathBuf;
use tracing_actix_web::TracingLogger;
use dotenv::dotenv;
use env_logger;
use log::{info, error};
use tokio;

use db::executor::DbExecutor;
use middleware::logger::Logger;
use middleware::auth::Auth;
use api::Server;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化环境变量
    dotenv::dotenv().ok();
    
    // 初始化日志
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    
    // 创建应用配置
    let config = config::AppConfig::default();
    
    // 创建和启动服务器
    info!("Starting Lumos-DB server...");
    match Server::new(config) {
        Ok(server) => {
            if let Err(e) = server.run().await {
                error!("Server error: {}", e);
                return Err(e.into());
            }
        },
        Err(e) => {
            error!("Failed to create server: {}", e);
            return Err(e.into());
        }
    }
    
    Ok(())
}
