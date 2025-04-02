use actix_web::{get, web, HttpResponse, Responder};
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::models::response::ApiResponse;

#[derive(Serialize)]
pub struct HealthStatus {
    status: String,
    version: String,
    uptime: u64,
    cpu_usage: f32,
    memory_usage: u64,
    connections: u32,
}

/// 健康检查API端点
#[get("")]
pub async fn health_check() -> impl Responder {
    // 获取当前时间戳
    let start_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    // 构建健康状态信息
    let health_status = HealthStatus {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime: start_time,
        cpu_usage: 0.5, // 示例值
        memory_usage: 1024 * 1024 * 100, // 示例值：100MB
        connections: 1, // 示例值
    };
    
    HttpResponse::Ok().json(ApiResponse::success(health_status))
}

/// 配置健康检查路由
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/health")
            .service(health_check)
    );
} 