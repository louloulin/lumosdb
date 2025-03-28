mod db;

use actix_web::web;

pub fn configure(cfg: &mut web::ServiceConfig) {
    // 数据库操作API
    cfg.service(
        web::scope("/db")
            .configure(db::configure)
    );
    
    // 添加其他API端点（向量搜索、AI等）将在后续阶段实现
} 