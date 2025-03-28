use std::future::{ready, Ready};
use std::pin::Pin;
use std::task::{Context, Poll};
use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error,
};
use futures_util::future::LocalBoxFuture;
use log::{info, error, debug};
use std::time::Instant;

// 日志中间件结构
pub struct Logger;

// 实现中间件转换特性
impl<S, B> Transform<S, ServiceRequest> for Logger
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = LoggerMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(LoggerMiddleware { service }))
    }
}

// 日志中间件服务
pub struct LoggerMiddleware<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for LoggerMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let start_time = Instant::now();
        let method = req.method().clone();
        let path = req.path().to_owned();
        let remote_addr = req.connection_info().realip_remote_addr().unwrap_or("unknown").to_owned();
        
        // 记录请求信息
        info!("Request: {} {} from {}", method, path, remote_addr);
        
        // 调用下一个中间件或处理程序
        let fut = self.service.call(req);
        
        Box::pin(async move {
            // 等待请求处理完成
            let res = fut.await;
            let elapsed = start_time.elapsed();
            
            match &res {
                Ok(response) => {
                    // 记录响应信息
                    let status = response.status();
                    info!("Response: {} {} - {} ({:?})",
                        method, path, status.as_u16(), elapsed);
                    
                    // 如果是错误状态码，记录更多详细信息
                    if status.is_client_error() || status.is_server_error() {
                        error!("Error response: {} {} - {}", method, path, status);
                    }
                }
                Err(e) => {
                    // 记录错误信息
                    error!("Request failed: {} {} - {:?} ({:?})",
                        method, path, e, elapsed);
                }
            }
            
            res
        })
    }
} 