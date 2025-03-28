use actix_web::{web, HttpResponse, Responder};
use std::sync::Arc;

use crate::db::executor::DbExecutor;
use crate::models::db::{QueryRequest, QueryResponse, ExecuteRequest, ExecuteResponse};
use crate::models::response::ApiResponse;
use crate::utils::error::AppError;

async fn query(
    db: web::Data<Arc<DbExecutor>>,
    req: web::Json<QueryRequest>,
) -> Result<impl Responder, AppError> {
    // 执行查询
    let rows = db.execute_query(&req.sql, &req.params)?;
    
    // 提取列名
    let columns = if !rows.is_empty() {
        rows[0].values.keys().cloned().collect()
    } else {
        Vec::new()
    };
    
    // 创建响应
    let response = QueryResponse {
        columns,
        rows: rows.iter().map(|r| r.values.clone()).collect(),
        row_count: rows.len(),
    };
    
    Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
}

async fn execute(
    db: web::Data<Arc<DbExecutor>>,
    req: web::Json<ExecuteRequest>,
) -> Result<impl Responder, AppError> {
    // 执行语句
    let rows_affected = db.execute(&req.sql, &req.params)?;
    
    // 创建响应
    let response = ExecuteResponse {
        rows_affected,
    };
    
    Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
}

async fn list_tables(
    db: web::Data<Arc<DbExecutor>>,
) -> Result<impl Responder, AppError> {
    // 获取表列表
    let tables = db.list_tables()?;
    
    Ok(HttpResponse::Ok().json(ApiResponse::success(tables)))
}

async fn get_table_info(
    db: web::Data<Arc<DbExecutor>>,
    name: web::Path<String>,
) -> Result<impl Responder, AppError> {
    // 获取表结构
    let columns = db.get_table_schema(&name)?;
    
    Ok(HttpResponse::Ok().json(ApiResponse::success(columns)))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.route("/query", web::post().to(query))
        .route("/execute", web::post().to(execute))
        .route("/tables", web::get().to(list_tables))
        .route("/tables/{name}", web::get().to(get_table_info));
} 