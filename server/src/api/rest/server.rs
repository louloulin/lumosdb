use std::sync::Arc;
use actix_web::{web, App, HttpServer, middleware};
use actix_cors::Cors;
use tracing_actix_web::TracingLogger;
use log::{info, error};

use crate::db::{DbExecutor, vector_executor::VectorExecutor};
use crate::config::ServerConfig;
use crate::middleware::auth::AuthMiddleware;

// 运行服务器
pub async fn run_server(config: ServerConfig) -> std::io::Result<()> {
    // 创建数据库执行器
    let db_path = config.db_path.clone();
    let db_executor = match DbExecutor::new(&db_path) {
        Ok(executor) => {
            info!("Successfully initialized database at {}", db_path);
            executor
        },
        Err(e) => {
            error!("Failed to initialize database at {}: {}", db_path, e);
            return Err(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()));
        }
    };
    
    // 创建向量数据库执行器
    let vector_db_path = config.vector_db_path.clone();
    let vector_executor = match VectorExecutor::new(&vector_db_path) {
        Ok(executor) => {
            info!("Successfully initialized vector database at {}", vector_db_path);
            executor
        },
        Err(e) => {
            error!("Failed to initialize vector database at {}: {}", vector_db_path, e);
            return Err(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()));
        }
    };
    
    // 共享执行器
    let db_executor = Arc::new(db_executor);
    let vector_executor = Arc::new(vector_executor);
    
    // 确定服务器地址
    let host = config.host.clone();
    let port = config.port;
    let bind_address = format!("{}:{}", host, port);
    
    info!("Starting Lumos-DB server on {}", bind_address);
    
    // 创建并启动HTTP服务器
    HttpServer::new(move || {
        // 配置CORS
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);
        
        // 构建应用
        App::new()
            // 中间件
            .wrap(TracingLogger::default())
            .wrap(middleware::Logger::default())
            .wrap(middleware::Compress::default())
            .wrap(cors)
            .wrap(AuthMiddleware::new(config.api_key.clone()))
            
            // 应用数据
            .app_data(web::Data::new(db_executor.clone()))
            .app_data(web::Data::new(vector_executor.clone()))
            
            // 配置路由
            .configure(super::configure_routes)
    })
    .bind(bind_address)?
    .run()
    .await
} 