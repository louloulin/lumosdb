use actix_web::{web, HttpResponse, Responder};
use crate::models::response::{ApiResponse, HealthResponse};

async fn health_check() -> impl Responder {
    let health = HealthResponse::new();
    HttpResponse::Ok().json(ApiResponse::success(health))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.route("", web::get().to(health_check));
} 