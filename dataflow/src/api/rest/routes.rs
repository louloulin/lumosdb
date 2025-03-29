use actix_web::{web, web::ServiceConfig};
use crate::api::rest::handlers;

/// 配置API路由
pub fn configure(cfg: &mut ServiceConfig) {
    cfg.service(
        web::scope("/api/v1")
            // 执行相关
            .service(
                web::scope("/execution")
                    .route("", web::post().to(handlers::start_execution))
                    .route("/{id}", web::get().to(handlers::get_execution_status))
                    .route("", web::get().to(handlers::list_executions))
                    .route("/{id}", web::delete().to(handlers::cancel_execution))
            )
            // 任务相关
            .service(
                web::scope("/job")
                    .route("/{id}", web::get().to(handlers::get_job_status))
            )
            // 配置相关
            .service(
                web::scope("/config")
                    .route("", web::post().to(handlers::upload_config))
                    .route("", web::get().to(handlers::get_config))
            )
            // 健康检查
            .route("/health", web::get().to(handlers::health_check))
    );
} 