use std::sync::Arc;
use actix_web::{web, HttpResponse, Responder};
use log::error;

use crate::db::VectorExecutor;
use crate::models::response::ApiResponse;
use crate::models::vector::{
    CreateCollectionRequest, AddEmbeddingsRequest, SearchRequest,
    CreateCollectionResponse, AddEmbeddingsResponse, SearchResponse,
    ListCollectionsResponse, Collection
};

/// 创建新的向量集合
pub async fn create_collection(
    executor: web::Data<Arc<VectorExecutor>>,
    req: web::Json<CreateCollectionRequest>,
) -> impl Responder {
    match executor.create_collection(&req.name, req.dimension) {
        Ok(created) => {
            let response = CreateCollectionResponse {
                name: req.name.clone(),
                dimension: req.dimension,
                created,
            };
            HttpResponse::Created().json(ApiResponse::success(response))
        },
        Err(err) => {
            error!("Error creating collection: {}", err);
            HttpResponse::InternalServerError().json(ApiResponse::<()>::error(&err.to_string()))
        }
    }
}

/// 列出所有向量集合
pub async fn list_collections(
    executor: web::Data<Arc<VectorExecutor>>,
) -> impl Responder {
    match executor.list_collections() {
        Ok(collections) => {
            let response = ListCollectionsResponse {
                collections: collections.into_iter().map(|(name, dimension)| {
                    Collection { name, dimension }
                }).collect(),
            };
            HttpResponse::Ok().json(ApiResponse::success(response))
        },
        Err(err) => {
            error!("Error listing collections: {}", err);
            HttpResponse::InternalServerError().json(ApiResponse::<()>::error(&err.to_string()))
        }
    }
}

/// 添加嵌入向量到集合
pub async fn add_embeddings(
    executor: web::Data<Arc<VectorExecutor>>,
    path: web::Path<String>,
    req: web::Json<AddEmbeddingsRequest>,
) -> impl Responder {
    let collection_name = path.into_inner();
    
    match executor.add_embeddings(&collection_name, &req.embeddings) {
        Ok(added) => {
            let response = AddEmbeddingsResponse {
                collection: collection_name,
                added,
                success: true,
            };
            HttpResponse::Ok().json(ApiResponse::success(response))
        },
        Err(err) => {
            error!("Error adding embeddings: {}", err);
            let status = match err {
                lumos_core::LumosError::NotFound(_) => HttpResponse::NotFound(),
                _ => HttpResponse::InternalServerError(),
            };
            status.json(ApiResponse::<()>::error(&err.to_string()))
        }
    }
}

/// 在集合中搜索相似向量
pub async fn search_similar(
    executor: web::Data<Arc<VectorExecutor>>,
    path: web::Path<String>,
    req: web::Json<SearchRequest>,
) -> impl Responder {
    let collection_name = path.into_inner();
    
    match executor.search_similar(&collection_name, &req.vector, req.top_k, req.include_value) {
        Ok(results) => {
            let response = SearchResponse {
                collection: collection_name,
                results,
                count: results.len(),
            };
            HttpResponse::Ok().json(ApiResponse::success(response))
        },
        Err(err) => {
            error!("Error searching vectors: {}", err);
            let status = match err {
                lumos_core::LumosError::NotFound(_) => HttpResponse::NotFound(),
                _ => HttpResponse::InternalServerError(),
            };
            status.json(ApiResponse::<()>::error(&err.to_string()))
        }
    }
}

/// 创建向量索引
pub async fn create_index(
    executor: web::Data<Arc<VectorExecutor>>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (collection_name, index_type) = path.into_inner();
    
    match executor.create_index(&collection_name, &index_type) {
        Ok(created) => {
            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "collection": collection_name,
                "index_type": index_type,
                "created": created,
            })))
        },
        Err(err) => {
            error!("Error creating index: {}", err);
            let status = match err {
                lumos_core::LumosError::NotFound(_) => HttpResponse::NotFound(),
                lumos_core::LumosError::InvalidArgument(_) => HttpResponse::BadRequest(),
                _ => HttpResponse::InternalServerError(),
            };
            status.json(ApiResponse::<()>::error(&err.to_string()))
        }
    }
} 