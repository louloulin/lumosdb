use std::sync::Arc;
use actix_web::{web, HttpResponse, Responder, post, get, delete, put};
use log::error;
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;
use crate::db::{DbExecutor, DbExecutorExtension};
use crate::models::response::{ApiResponse, ApiError};
use crate::utils::perf_monitor::PerfMonitor;
use crate::models::db::{ColumnInfo as ModelColumnInfo};

// 查询请求
#[derive(Debug, Deserialize)]
pub struct QueryRequest {
    pub sql: String,
    #[serde(default)]
    pub params: Vec<serde_json::Value>,
}

// 执行SQL请求
#[derive(Debug, Deserialize)]
pub struct ExecuteRequest {
    pub sql: String,
    #[serde(default)]
    pub params: Vec<serde_json::Value>,
}

// 创建表请求
#[derive(Debug, Deserialize)]
pub struct CreateTableRequest {
    pub sql: String, // CREATE TABLE SQL语句
}

// 表信息响应
#[derive(Debug, Serialize)]
pub struct TableInfo {
    pub name: String,
    pub columns: Vec<ModelColumnInfo>,
}

// Use the model's ColumnInfo directly to avoid type conversion
pub use crate::models::db::ColumnInfo;

// 性能监控器
static QUERY_MONITOR: Lazy<PerfMonitor> = Lazy::new(|| {
    PerfMonitor::new("db_query")
});

static EXECUTE_MONITOR: Lazy<PerfMonitor> = Lazy::new(|| {
    PerfMonitor::new("db_execute")
});

// 配置数据库处理程序路由
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/db")
            .route("/query", web::post().to(query))
            .route("/execute", web::post().to(execute_sql))
            .route("/tables", web::get().to(get_tables))
            .route("/tables/{table_name}", web::get().to(get_table_info))
            .route("/tables", web::post().to(create_table))
            .route("/tables/{table_name}", web::delete().to(drop_table))
    );
}

async fn query(
    db_executor: web::Data<Arc<DbExecutor>>,
    query_req: web::Json<QueryRequest>,
) -> impl Responder {
    // 启动性能监控
    let _timer = QUERY_MONITOR.start();
    
    log::debug!("Executing query: {} with params: {:?}", query_req.sql, query_req.params);
    
    match db_executor.query_with_params(query_req.sql.clone(), query_req.params.clone()) {
        Ok(rows) => {
            // 提取列名
            let columns = if !rows.is_empty() {
                match &rows[0] {
                    serde_json::Value::Object(obj) => {
                        obj.keys().cloned().collect()
                    },
                    _ => Vec::new()
                }
            } else {
                Vec::new()
            };
            
            // 创建符合客户端期望的结构
            let response = serde_json::json!({
                "columns": columns,
                "rows": rows,
                "count": rows.len()
            });
            
            HttpResponse::Ok().json(ApiResponse::success(response))
        },
        Err(e) => {
            log::error!("Database query error: {}", e);
            HttpResponse::BadRequest().json(ApiResponse::<()>::error(
                ApiError::new("DATABASE_QUERY_ERROR", &format!("Query failed: {}", e))
            ))
        }
    }
}

async fn execute_sql(
    db_executor: web::Data<Arc<DbExecutor>>,
    execute_req: web::Json<ExecuteRequest>,
) -> impl Responder {
    // 启动性能监控
    let _timer = EXECUTE_MONITOR.start();
    
    log::debug!("Executing SQL: {} with params: {:?}", execute_req.sql, execute_req.params);
    
    // 打印参数类型和值以便调试
    for (i, param) in execute_req.params.iter().enumerate() {
        log::debug!("Parameter {}: type={}, value={:?}", i, param.as_str().map_or_else(|| "non-string", |_| "string"), param);
    }
    
    match db_executor.execute_with_params(execute_req.sql.clone(), execute_req.params.clone()) {
        Ok(affected_rows) => {
            log::debug!("SQL executed successfully, affected rows: {}", affected_rows);
            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "affected_rows": affected_rows
            })))
        },
        Err(e) => {
            log::error!("Database execute error: {}", e);
            HttpResponse::BadRequest().json(ApiResponse::<()>::error(
                ApiError::new("DATABASE_EXECUTE_ERROR", &format!("Execute failed: {}", e))
            ))
        }
    }
}

async fn get_tables(
    db_executor: web::Data<Arc<DbExecutor>>,
) -> impl Responder {
    match db_executor.get_tables() {
        Ok(tables) => {
            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "tables": tables
            })))
        },
        Err(e) => {
            log::error!("Error getting tables: {}", e);
            HttpResponse::InternalServerError().json(ApiResponse::<()>::error(
                ApiError::new("DATABASE_ERROR", &format!("Failed to get tables: {}", e))
            ))
        }
    }
}

async fn get_table_info(
    db_executor: web::Data<Arc<DbExecutor>>,
    path: web::Path<String>,
) -> impl Responder {
    let table_name = path.into_inner();
    
    match db_executor.get_table_info(&table_name) {
        Ok(columns) => {
            let table_info = TableInfo {
                name: table_name,
                columns,
            };
            HttpResponse::Ok().json(ApiResponse::success(table_info))
        },
        Err(e) => {
            log::error!("Error getting table info: {}", e);
            HttpResponse::BadRequest().json(ApiResponse::<()>::error(
                ApiError::new("TABLE_INFO_ERROR", &format!("Failed to get table info: {}", e))
            ))
        }
    }
}

async fn create_table(
    db_executor: web::Data<Arc<DbExecutor>>,
    create_req: web::Json<CreateTableRequest>,
) -> impl Responder {
    match db_executor.execute_sql(create_req.sql.clone()) {
        Ok(_) => {
            HttpResponse::Created().json(ApiResponse::success(serde_json::json!({
                "message": "Table created successfully"
            })))
        },
        Err(e) => {
            log::error!("Error creating table: {}", e);
            HttpResponse::BadRequest().json(ApiResponse::<()>::error(
                ApiError::new("TABLE_CREATE_ERROR", &format!("Failed to create table: {}", e))
            ))
        }
    }
}

async fn drop_table(
    db_executor: web::Data<Arc<DbExecutor>>,
    path: web::Path<String>,
) -> impl Responder {
    let table_name = path.into_inner();
    let drop_sql = format!("DROP TABLE IF EXISTS {}", table_name);
    
    match db_executor.execute_sql(drop_sql) {
        Ok(_) => {
            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "message": format!("Table '{}' dropped successfully", table_name)
            })))
        },
        Err(e) => {
            log::error!("Error dropping table {}: {}", table_name, e);
            HttpResponse::BadRequest().json(ApiResponse::<()>::error(
                ApiError::new("TABLE_DROP_ERROR", &format!("Failed to drop table: {}", e))
            ))
        }
    }
}
