mod handlers;
mod routes;

use actix::Addr;
use actix_web::{App, HttpServer, web::Data};
use log::info;
use std::sync::Arc;

use crate::actors::dag_manager::DAGManagerActor;

/// 启动API服务器
pub async fn start_api_server(
    dag_manager: Addr<DAGManagerActor>,
    host: &str, 
    port: u16
) -> std::io::Result<()> {
    info!("启动ETL API服务器 - {}:{}", host, port);
    
    // 创建HTTP服务器
    HttpServer::new(move || {
        App::new()
            .app_data(Data::new(dag_manager.clone()))
            .configure(routes::configure)
    })
    .bind((host, port))?
    .run()
    .await
} 