use std::sync::Arc;
use actix_web::{web, HttpResponse, Responder};
use log::error;

use crate::db::DbExecutor;
use crate::models::response::ApiResponse;

// 创建数据库
pub async fn create_database(
    _executor: web::Data<Arc<DbExecutor>>,
    _path: web::Path<String>,
) -> impl Responder {
    // 暂时返回未实现
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Not implemented yet"))
}

// 删除数据库
pub async fn delete_database(
    _executor: web::Data<Arc<DbExecutor>>,
    _path: web::Path<String>,
) -> impl Responder {
    // 暂时返回未实现
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Not implemented yet"))
}

// 列出表格
pub async fn list_tables(
    _executor: web::Data<Arc<DbExecutor>>,
    _path: web::Path<String>,
) -> impl Responder {
    // 暂时返回未实现
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Not implemented yet"))
}

// 创建表格
pub async fn create_table(
    _executor: web::Data<Arc<DbExecutor>>,
    _path: web::Path<(String, String)>,
) -> impl Responder {
    // 暂时返回未实现
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Not implemented yet"))
}

// 删除表格
pub async fn delete_table(
    _executor: web::Data<Arc<DbExecutor>>,
    _path: web::Path<(String, String)>,
) -> impl Responder {
    // 暂时返回未实现
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Not implemented yet"))
}

// 插入行
pub async fn insert_row(
    _executor: web::Data<Arc<DbExecutor>>,
    _path: web::Path<(String, String)>,
) -> impl Responder {
    // 暂时返回未实现
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Not implemented yet"))
}

// 查询行
pub async fn query_rows(
    _executor: web::Data<Arc<DbExecutor>>,
    _path: web::Path<(String, String)>,
) -> impl Responder {
    // 暂时返回未实现
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Not implemented yet"))
}

// 获取行
pub async fn get_row(
    _executor: web::Data<Arc<DbExecutor>>,
    _path: web::Path<(String, String, String)>,
) -> impl Responder {
    // 暂时返回未实现
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Not implemented yet"))
}

// 更新行
pub async fn update_row(
    _executor: web::Data<Arc<DbExecutor>>,
    _path: web::Path<(String, String, String)>,
) -> impl Responder {
    // 暂时返回未实现
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Not implemented yet"))
}

// 删除行
pub async fn delete_row(
    _executor: web::Data<Arc<DbExecutor>>,
    _path: web::Path<(String, String, String)>,
) -> impl Responder {
    // 暂时返回未实现
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Not implemented yet"))
}

// 执行查询
pub async fn execute_query(
    _executor: web::Data<Arc<DbExecutor>>,
    _path: web::Path<String>,
) -> impl Responder {
    // 暂时返回未实现
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Not implemented yet"))
}
