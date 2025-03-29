mod db;
pub mod server;
pub mod handlers;

use actix_web::web;

// 配置所有REST API路由
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    // 配置通用API前缀
    cfg.service(
        web::scope("/api")
            .configure(handlers::db_handler::configure)
            .configure(handlers::vector_handlers::configure)
    );
}

// 重新导出服务器模块
pub use server::run_server;

pub fn configure(cfg: &mut web::ServiceConfig) {
    // 数据库操作API
    cfg.service(
        web::scope("/db")
            .configure(db::configure)
    );
    
    // 添加其他API端点（向量搜索、AI等）将在后续阶段实现
} 