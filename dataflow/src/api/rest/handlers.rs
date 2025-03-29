use actix::Addr;
use actix_web::{web, HttpResponse, Error, error::ErrorInternalServerError};
use serde::{Serialize, Deserialize};
use std::sync::{Arc, RwLock};
use log::{info, error};
use uuid::Uuid;

use crate::actors::dag_manager::DAGManagerActor;
use crate::actors::messages::*;
use crate::config::ETLConfig;
use crate::types::*;

/// API响应包装
#[derive(Serialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>
}

impl<T> ApiResponse<T> {
    fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None
        }
    }
    
    fn error(message: &str) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.to_string())
        }
    }
}

/// 启动执行请求
#[derive(Deserialize)]
pub struct StartExecutionRequest {
    /// 可选：执行ID，如果不提供则自动生成
    pub execution_id: Option<String>,
}

/// 启动执行响应
#[derive(Serialize)]
pub struct StartExecutionResponse {
    pub execution_id: String,
}

/// 启动DAG执行
pub async fn start_execution(
    dag_manager: web::Data<Addr<DAGManagerActor>>,
    req: web::Json<StartExecutionRequest>,
) -> Result<HttpResponse, Error> {
    // 生成或使用提供的执行ID
    let execution_id = req.execution_id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
    
    info!("启动DAG执行：{}", execution_id);
    
    // 向DAG管理器发送启动消息
    let result = dag_manager.send(StartDAGExecution { execution_id: execution_id.clone() }).await
        .map_err(|e| {
            error!("发送StartDAGExecution消息失败: {}", e);
            ErrorInternalServerError(format!("发送StartDAGExecution消息失败: {}", e))
        })?;
    
    match result {
        Ok(_) => {
            let response = StartExecutionResponse { execution_id };
            Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
        },
        Err(e) => {
            error!("启动DAG执行失败: {}", e);
            Ok(HttpResponse::InternalServerError().json(ApiResponse::<()>::error(&e)))
        }
    }
}

/// 获取执行状态
pub async fn get_execution_status(
    dag_manager: web::Data<Addr<DAGManagerActor>>,
    path: web::Path<String>,
) -> Result<HttpResponse, Error> {
    let execution_id = path.into_inner();
    
    info!("获取DAG执行状态：{}", execution_id);
    
    // 向DAG管理器发送状态查询消息
    let result = dag_manager.send(GetDAGExecutionStatus { execution_id: execution_id.clone() }).await
        .map_err(|e| {
            error!("发送GetDAGExecutionStatus消息失败: {}", e);
            ErrorInternalServerError(format!("发送GetDAGExecutionStatus消息失败: {}", e))
        })?;
    
    match result {
        Some(status) => Ok(HttpResponse::Ok().json(ApiResponse::success(status))),
        None => Ok(HttpResponse::NotFound().json(ApiResponse::<()>::error(&format!("找不到执行记录：{}", execution_id))))
    }
}

/// 列出所有执行
pub async fn list_executions(
    dag_manager: web::Data<Addr<DAGManagerActor>>,
) -> Result<HttpResponse, Error> {
    info!("列出所有DAG执行");
    
    // 向DAG管理器发送列表查询消息
    let result = dag_manager.send(ListDAGExecutions).await
        .map_err(|e| {
            error!("发送ListDAGExecutions消息失败: {}", e);
            ErrorInternalServerError(format!("发送ListDAGExecutions消息失败: {}", e))
        })?;
    
    Ok(HttpResponse::Ok().json(ApiResponse::success(result)))
}

/// 取消执行
pub async fn cancel_execution(
    dag_manager: web::Data<Addr<DAGManagerActor>>,
    path: web::Path<String>,
) -> Result<HttpResponse, Error> {
    let execution_id = path.into_inner();
    
    info!("取消DAG执行：{}", execution_id);
    
    // 向DAG管理器发送取消消息
    let result = dag_manager.send(CancelDAGExecution { execution_id: execution_id.clone() }).await
        .map_err(|e| {
            error!("发送CancelDAGExecution消息失败: {}", e);
            ErrorInternalServerError(format!("发送CancelDAGExecution消息失败: {}", e))
        })?;
    
    match result {
        true => Ok(HttpResponse::Ok().json(ApiResponse::<()>::success(()))),
        false => Ok(HttpResponse::NotFound().json(ApiResponse::<()>::error(&format!("找不到执行记录：{}", execution_id))))
    }
}

/// 获取任务状态
pub async fn get_job_status(
    _dag_manager: web::Data<Addr<DAGManagerActor>>,
    _path: web::Path<String>,
) -> Result<HttpResponse, Error> {
    // 这个接口需要更复杂的实现，涉及到向特定的任务Actor发送消息
    // 简化版本直接返回未实现
    Ok(HttpResponse::NotImplemented().json(ApiResponse::<()>::error("该接口尚未实现")))
}

/// 全局ETL配置
static CONFIG: RwLock<Option<ETLConfig>> = RwLock::new(None);

/// 上传配置
pub async fn upload_config(
    config: web::Json<ETLConfig>,
) -> Result<HttpResponse, Error> {
    info!("上传ETL配置：{}", config.name);
    
    // 验证配置
    match config.validate() {
        Ok(_) => {
            // 保存配置
            let mut config_writer = CONFIG.write().unwrap();
            *config_writer = Some(config.into_inner());
            
            Ok(HttpResponse::Ok().json(ApiResponse::<()>::success(())))
        },
        Err(e) => {
            error!("配置验证失败: {}", e);
            Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(&format!("配置验证失败: {}", e))))
        }
    }
}

/// 获取配置
pub async fn get_config() -> Result<HttpResponse, Error> {
    info!("获取ETL配置");
    
    let config_reader = CONFIG.read().unwrap();
    
    match &*config_reader {
        Some(config) => Ok(HttpResponse::Ok().json(ApiResponse::success(config))),
        None => Ok(HttpResponse::NotFound().json(ApiResponse::<()>::error("未找到配置")))
    }
}

/// 健康检查
pub async fn health_check() -> Result<HttpResponse, Error> {
    Ok(HttpResponse::Ok().json(ApiResponse::success("ETL服务正常运行")))
} 