use actix_web::{web, HttpResponse, Responder};
use chrono::Utc;
use serde::Serialize;
use crate::models::response::ApiResponse;

#[derive(Serialize)]
pub struct HealthInfo {
    status: String,
    version: String,
    timestamp: i64,
}

// 配置健康检查API路由
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.route("", web::get().to(health_check));
}

// 健康检查处理程序
async fn health_check() -> impl Responder {
    let health_info = HealthInfo {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: Utc::now().timestamp(),
    };
    
    HttpResponse::Ok().json(ApiResponse::success(health_info))
} 