use std::sync::Arc;
use actix_web::{web, HttpResponse, Responder};
use log::error;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use once_cell::sync::Lazy;
use crate::db::vector_executor::{VectorExecutor, VectorExecutorExtension};
use crate::models::response::{ApiResponse, ApiError};
use crate::utils::perf_monitor::PerfMonitor;

use crate::models::vector::{
    CreateCollectionRequest, AddEmbeddingsRequest, SearchRequest,
    CreateCollectionResponse, AddEmbeddingsResponse, SearchResponse,
    ListCollectionsResponse, Collection, Embedding, SearchResult
};

/// 性能监控器
static SEARCH_MONITOR: Lazy<PerfMonitor> = Lazy::new(|| {
    PerfMonitor::new("vector_search")
});

static ADD_EMBEDDINGS_MONITOR: Lazy<PerfMonitor> = Lazy::new(|| {
    PerfMonitor::new("add_embeddings")
});

/// 配置向量处理程序路由
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/vector")
            .route("/collections", web::get().to(list_collections))
            .route("/collections", web::post().to(create_collection))
            .route("/collections/{name}", web::get().to(get_collection))
            .route("/collections/{name}", web::delete().to(delete_collection))
            .route("/collections/{name}/embeddings", web::post().to(add_embeddings))
            .route("/collections/{name}/search", web::post().to(search_similar))
            .route("/collections/{name}/index/{index_type}", web::post().to(create_index))
            .route("/collections/{name}/index", web::delete().to(delete_index))
    );
}

/// 向量集合响应
#[derive(Debug, Serialize)]
pub struct CollectionResponse {
    pub name: String,
    pub dimension: usize,
    pub distance: String,
    pub count: usize,
}

/// 向量集合列表响应
#[derive(Debug, Serialize)]
pub struct CollectionsListResponse {
    pub collections: Vec<CollectionResponse>,
}

/// 创建索引请求
#[derive(Debug, Deserialize)]
pub struct CreateIndexRequest {
    pub index_type: Option<String>,
    pub parameters: Option<serde_json::Value>,
}

/// 创建索引响应
#[derive(Debug, Serialize)]
pub struct CreateIndexResponse {
    pub collection: String,
    pub index_type: String,
    pub created: bool,
}

/// 搜索结果
#[derive(Debug, Serialize)]
pub struct SearchResultItem {
    pub id: String,
    pub score: f32,
    pub vector: Option<Vec<f32>>,
    pub metadata: Option<serde_json::Value>,
}

/// 列出所有向量集合
pub async fn list_collections(
    vector_executor: web::Data<Arc<VectorExecutor>>,
) -> impl Responder {
    match vector_executor.list_collections().await {
        Ok(collections) => {
            let mut response_collections = Vec::new();
            
            for collection_name in collections {
                if let Ok(info) = vector_executor.get_collection_info(collection_name.clone()).await {
                    let count = vector_executor.get_collection_count(collection_name.clone())
                        .await
                        .unwrap_or(0);
                    
                    response_collections.push(CollectionResponse {
                        name: collection_name,
                        dimension: info.size,
                        distance: info.distance,
                        count,
                    });
                }
            }
            
            HttpResponse::Ok().json(ApiResponse::success(CollectionsListResponse {
                collections: response_collections,
            }))
        },
        Err(e) => {
            log::error!("Error listing collections: {}", e);
            HttpResponse::InternalServerError().json(ApiResponse::<()>::error(
                ApiError::new("VECTOR_ERROR", &format!("Failed to list collections: {}", e))
            ))
        }
    }
}

/// 创建新的向量集合
pub async fn create_collection(
    create_req: web::Json<CreateCollectionRequest>,
    vector_executor: web::Data<Arc<VectorExecutor>>,
) -> impl Responder {
    let distance = "euclidean".to_string();

    match vector_executor.create_collection(create_req.name.clone(), create_req.dimension, distance).await {
        Ok(_) => {
            let response = ApiResponse::success(CreateCollectionResponse {
                name: create_req.name.clone(),
                dimension: create_req.dimension,
                created: true,
            });
            HttpResponse::Ok().json(response)
        }
        Err(err) => {
            HttpResponse::InternalServerError().json(ApiResponse::<String>::error(err))
        }
    }
}

pub async fn get_collection(
    vector_executor: web::Data<Arc<VectorExecutor>>,
    path: web::Path<String>,
) -> impl Responder {
    let name = path.into_inner();
    
    match vector_executor.get_collection_info(name.clone()).await {
        Ok(info) => {
            let count = vector_executor.get_collection_count(name.clone())
                .await
                .unwrap_or(0);
            
            HttpResponse::Ok().json(ApiResponse::success(CollectionResponse {
                name,
                dimension: info.size,
                distance: info.distance,
                count,
            }))
        },
        Err(e) => {
            log::error!("Error getting collection info: {}", e);
            HttpResponse::NotFound().json(ApiResponse::<()>::error(
                ApiError::new("COLLECTION_NOT_FOUND", &format!("Collection not found: {}", e))
            ))
        }
    }
}

pub async fn delete_collection(
    vector_executor: web::Data<Arc<VectorExecutor>>,
    path: web::Path<String>,
) -> impl Responder {
    let name = path.into_inner();
    
    match vector_executor.delete_collection(name.clone()).await {
        Ok(_) => {
            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "message": format!("Collection '{}' deleted successfully", name)
            })))
        },
        Err(e) => {
            log::error!("Error deleting collection: {}", e);
            HttpResponse::BadRequest().json(ApiResponse::<()>::error(
                ApiError::new("COLLECTION_DELETE_ERROR", &format!("Failed to delete collection: {}", e))
            ))
        }
    }
}

/// 添加嵌入向量到集合
pub async fn add_embeddings(
    path: web::Path<String>,
    add_req: web::Json<AddEmbeddingsRequest>,
    vector_executor: web::Data<Arc<VectorExecutor>>,
) -> impl Responder {
    let collection_name = path.into_inner();
    
    // Extract ids and embeddings separately to match the signature
    let ids = add_req.ids.clone();
    let embeddings = add_req.embeddings.clone();
    
    // Convert metadata to the expected format
    let metadata_option = add_req.metadata.clone().map(|metadata_list| {
        // Convert each HashMap to a serde_json::Value
        metadata_list.iter().map(|map| {
            Some(serde_json::to_value(map).unwrap_or(serde_json::Value::Null))
        }).collect::<Vec<_>>()
    });
    
    match vector_executor.add_embeddings(collection_name.clone(), ids, embeddings, metadata_option).await {
        Ok(count) => {
            let response = ApiResponse::success(AddEmbeddingsResponse {
                collection: collection_name,
                added: count,
                success: true,
            });
            HttpResponse::Ok().json(response)
        }
        Err(err) => {
            HttpResponse::InternalServerError().json(ApiResponse::<String>::error(err))
        }
    }
}

/// 在集合中搜索相似向量
pub async fn search_similar(
    path: web::Path<String>,
    search_req: web::Json<SearchRequest>,
    vector_executor: web::Data<Arc<VectorExecutor>>,
) -> impl Responder {
    let collection_name = path.into_inner();
    
    // We only need 3 arguments for search_similar according to the implementation
    match vector_executor.search_similar(
        collection_name.clone(),
        search_req.vector.clone(),
        search_req.top_k
    ).await {
        Ok(results) => {
            let search_results = results.into_iter().map(|result| {
                SearchResult {
                    id: result.id,
                    score: result.score,
                    vector: result.vector,
                    metadata: result.metadata.map(|m| {
                        // Convert Value to HashMap if needed
                        if let serde_json::Value::Object(map) = m {
                            let mut hm = HashMap::new();
                            for (k, v) in map {
                                hm.insert(k, v);
                            }
                            hm
                        } else {
                            HashMap::new()
                        }
                    }),
                }
            }).collect::<Vec<_>>();
            
            // Calculate count before moving search_results
            let count = search_results.len();
            
            let response = ApiResponse::success(SearchResponse {
                collection: collection_name,
                results: search_results,
                count: count,
            });
            
            HttpResponse::Ok().json(response)
        }
        Err(err) => {
            HttpResponse::InternalServerError().json(ApiResponse::<String>::error(err))
        }
    }
}

/// 创建向量索引
pub async fn create_index(
    vector_executor: web::Data<Arc<VectorExecutor>>,
    path: web::Path<(String, String)>,
    _index_req: web::Json<Option<CreateIndexRequest>>,
) -> impl Responder {
    let (name, index_type) = path.into_inner();
    
    match vector_executor.create_index(name.clone(), index_type.clone()).await {
        Ok(_) => {
            HttpResponse::Ok().json(ApiResponse::success(CreateIndexResponse {
                collection: name,
                index_type,
                created: true,
            }))
        },
        Err(e) => {
            log::error!("Error creating index: {}", e);
            HttpResponse::BadRequest().json(ApiResponse::<()>::error(
                ApiError::new("INDEX_CREATE_ERROR", &format!("Failed to create index: {}", e))
            ))
        }
    }
}

/// 删除向量索引
pub async fn delete_index(
    vector_executor: web::Data<Arc<VectorExecutor>>,
    path: web::Path<String>,
) -> impl Responder {
    let name = path.into_inner();
    
    match vector_executor.delete_index(name.clone()).await {
        Ok(_) => {
            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "message": format!("Index for collection '{}' deleted successfully", name)
            })))
        },
        Err(e) => {
            log::error!("Error deleting index: {}", e);
            HttpResponse::BadRequest().json(ApiResponse::<()>::error(
                ApiError::new("INDEX_DELETE_ERROR", &format!("Failed to delete index: {}", e))
            ))
        }
    }
} 