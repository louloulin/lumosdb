use std::sync::Arc;
use actix_web::{web, HttpResponse, Responder};
use log::{info, error};

use crate::db::cached_executor::CachedDbExecutor;
use crate::models::response::ApiResponse;

/// 清空所有缓存
pub async fn clear_all_cache(
    cached_executor: web::Data<Arc<CachedDbExecutor>>,
) -> impl Responder {
    info!("Clearing all cache");
    cached_executor.clear_all_cache();
    HttpResponse::Ok().json(ApiResponse::<()>::success(()))
}

/// 清理特定表相关的缓存
pub async fn invalidate_table_cache(
    cached_executor: web::Data<Arc<CachedDbExecutor>>,
    path: web::Path<String>,
) -> impl Responder {
    let table_name = path.into_inner();
    info!("Invalidating cache for table: {}", table_name);
    
    cached_executor.invalidate_table_cache(&table_name);
    
    HttpResponse::Ok().json(ApiResponse::<()>::success(()))
}

/// 获取缓存状态信息
pub async fn get_cache_status(
    _cached_executor: web::Data<Arc<CachedDbExecutor>>,
) -> impl Responder {
    // 由于当前没有直接提供获取缓存统计信息的方法，这里返回未实现
    // 可以在CachedDbExecutor中添加获取缓存统计信息的方法，并在这里使用
    HttpResponse::NotImplemented().json(ApiResponse::<()>::error("Cache status query not implemented yet"))
} 