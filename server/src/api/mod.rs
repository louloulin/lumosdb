pub mod rest;
pub mod health;

use actix_web::web;

/// 配置所有API路由
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    // 健康检查API
    cfg.service(
        web::scope("/health")
            .configure(health::configure)
    );
    
    // REST API
    cfg.service(
        web::scope("/rest")
            .configure(rest::configure)
    );
}

pub use actix_web::dev::Server; 