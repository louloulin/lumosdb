use std::sync::Arc;
use actix_web::{web, App, HttpServer, middleware};
use actix_cors::Cors;
use log::info;

use crate::config::AppConfig;
use crate::db::DbExecutor;
use crate::db::CachedDbExecutor;
use crate::db::VectorExecutor;
use crate::api::rest::handlers;
use crate::middleware::auth::Auth;
use crate::middleware::logger::Logger;

pub struct Server {
    config: AppConfig,
    executor: Arc<DbExecutor>,
    cached_executor: Arc<CachedDbExecutor>,
    vector_executor: Arc<VectorExecutor>,
}

impl Server {
    pub fn new(config: AppConfig) -> Result<Self, String> {
        let executor = match DbExecutor::new(&config.db_path) {
            Ok(executor) => Arc::new(executor),
            Err(e) => return Err(format!("Failed to create executor: {}", e)),
        };
        
        let cached_executor = match CachedDbExecutor::new(&config.db_path) {
            Ok(executor) => Arc::new(executor),
            Err(e) => return Err(format!("Failed to create cached executor: {}", e)),
        };
        
        let vector_executor = match VectorExecutor::new(&config.db_path) {
            Ok(executor) => Arc::new(executor),
            Err(e) => return Err(format!("Failed to create vector executor: {}", e)),
        };

        Ok(Self {
            config,
            executor,
            cached_executor,
            vector_executor,
        })
    }

    pub async fn run(&self) -> Result<(), String> {
        let server_addr = format!("{}:{}", self.config.host, self.config.port);
        let executor = self.executor.clone();
        let cached_executor = self.cached_executor.clone();
        let vector_executor = self.vector_executor.clone();

        info!("Starting server at {}", server_addr);

        let server = HttpServer::new(move || {
            // 配置CORS
            let cors = Cors::default()
                .allow_any_origin()
                .allow_any_method()
                .allow_any_header()
                .max_age(3600);

            App::new()
                .wrap(middleware::Compress::default()) // 压缩响应
                .wrap(middleware::NormalizePath::trim()) // 路径规范化
                .wrap(Logger) // 日志中间件
                .wrap(Auth::default()) // 认证中间件
                .wrap(cors) // CORS中间件
                .wrap(middleware::Logger::default()) // Actix日志
                .app_data(web::Data::new(executor.clone()))
                .app_data(web::Data::new(cached_executor.clone()))
                .app_data(web::Data::new(vector_executor.clone()))
                
                // 健康检查API
                .service(
                    web::scope("/api/health")
                        .route("", web::get().to(|| async { "Lumos-DB Server is running" }))
                )
                
                // 数据库API路由
                .service(
                    web::scope("/api/db")
                        .route("/{db_name}", web::post().to(handlers::create_database))
                        .route("/{db_name}", web::delete().to(handlers::delete_database))
                        .route("/{db_name}/tables", web::get().to(handlers::list_tables))
                        .route("/{db_name}/tables/{table_name}", web::post().to(handlers::create_table))
                        .route("/{db_name}/tables/{table_name}", web::delete().to(handlers::delete_table))
                        .route("/{db_name}/tables/{table_name}/rows", web::post().to(handlers::insert_row))
                        .route("/{db_name}/tables/{table_name}/rows", web::get().to(handlers::query_rows))
                        .route("/{db_name}/tables/{table_name}/rows/{row_id}", web::get().to(handlers::get_row))
                        .route("/{db_name}/tables/{table_name}/rows/{row_id}", web::put().to(handlers::update_row))
                        .route("/{db_name}/tables/{table_name}/rows/{row_id}", web::delete().to(handlers::delete_row))
                        .route("/{db_name}/query", web::post().to(handlers::execute_query))
                )
                
                // 缓存API路由
                .service(
                    web::scope("/api/cache")
                        .route("", web::delete().to(handlers::clear_all_cache))
                        .route("/tables/{table_name}", web::delete().to(handlers::invalidate_table_cache))
                        .route("/status", web::get().to(handlers::get_cache_status))
                )
                
                // 向量API路由
                .service(
                    web::scope("/api/vector")
                        .route("/collections", web::post().to(handlers::create_collection))
                        .route("/collections", web::get().to(handlers::list_collections))
                        .route("/collections/{collection_name}/embeddings", web::post().to(handlers::add_embeddings))
                        .route("/collections/{collection_name}/search", web::post().to(handlers::search_similar))
                        .route("/collections/{collection_name}/index/{index_type}", web::post().to(handlers::create_index))
                )
        })
        .bind(&server_addr)
        .map_err(|e| format!("Failed to bind server to {}: {}", server_addr, e))?;

        server.run()
            .await
            .map_err(|e| format!("Server error: {}", e))
    }
} 