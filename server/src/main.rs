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

use db::executor::DbExecutor;
use middleware::logger::Logger;
use middleware::auth::Auth;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 加载环境变量
    dotenv().ok();
    
    // 初始化日志
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    
    // 获取配置
    let db_path = env::var("LUMOS_DB_PATH").unwrap_or_else(|_| "data.lumos".to_string());
    let host = env::var("LUMOS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("LUMOS_PORT").unwrap_or_else(|_| "8000".to_string())
        .parse::<u16>()
        .unwrap_or(8000);
        
    log::info!("正在连接数据库: {}", db_path);
    
    // 创建数据库执行器
    let db_executor = match DbExecutor::new(&db_path) {
        Ok(executor) => {
            log::info!("数据库连接成功");
            Arc::new(executor)
        },
        Err(e) => {
            log::error!("无法连接到数据库: {}", e);
            return Err(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()));
        }
    };
    
    // 启动服务器
    log::info!("启动服务器 http://{}:{}", host, port);
    
    // 启动HTTP服务器
    HttpServer::new(move || {
        // 配置CORS
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);
            
        App::new()
            .app_data(web::Data::new(db_executor.clone()))
            .wrap(cors)                               // CORS中间件
            .wrap(Logger)                             // 自定义日志中间件
            .wrap(Auth)                               // 自定义认证中间件
            .wrap(TracingLogger::default())           // 追踪日志
            .wrap(actix_middleware::Compress::default()) // 压缩
            .wrap(actix_middleware::NormalizePath::trim()) // 路径规范化
            .service(
                web::scope("/api")
                    .configure(api::configure_routes)
            )
            .default_service(web::to(|| async { "Lumos-DB Server" }))
    })
    .bind((host, port))?
    .run()
    .await
}
