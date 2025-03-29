use actix::prelude::*;
use log::{info, error, debug, warn};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use chrono::Utc;

use crate::types::{PipelineConfig, DataRecord, JobStats, ETLError, JobStatus};
use crate::actors::messages::{ExtractData, TransformData, LoadData};

/// 开始数据管道执行
#[derive(Message)]
#[rtype(result = "Result<(), String>")]
pub struct StartPipeline;

/// 停止数据管道执行
#[derive(Message)]
#[rtype(result = "()")]
pub struct StopPipeline;

/// 获取管道统计信息
#[derive(Message)]
#[rtype(result = "JobStats")]
pub struct GetPipelineStats;

/// 数据管道Actor，负责协调Extract、Transform、Load过程
pub struct PipelineActor {
    config: PipelineConfig,
    stats: JobStats,
    running: bool,
    data_buffer: Vec<DataRecord>,
    extractors: HashMap<String, Addr<dyn Actor>>,
    transformers: HashMap<String, Addr<dyn Actor>>,
    loaders: HashMap<String, Addr<dyn Actor>>,
    current_extractor: Option<String>,
    current_transformer: Option<String>,
    current_loader: Option<String>,
}

impl PipelineActor {
    /// 创建新的数据管道Actor
    pub fn new(config: PipelineConfig) -> Result<Self, ETLError> {
        // 初始化基本统计信息
        let stats = JobStats {
            job_id: config.id.clone(),
            start_time: None,
            end_time: None,
            duration_ms: None,
            status: JobStatus::Pending,
            records_read: 0,
            records_written: 0,
            records_failed: 0,
            error: None,
            retry_count: 0,
        };
        
        Ok(Self {
            config,
            stats,
            running: false,
            data_buffer: Vec::new(),
            extractors: HashMap::new(),
            transformers: HashMap::new(),
            loaders: HashMap::new(),
            current_extractor: None,
            current_transformer: None,
            current_loader: None,
        })
    }
    
    /// 注册数据提取器
    pub fn register_extractor(&mut self, name: &str, addr: Addr<dyn Actor>) {
        self.extractors.insert(name.to_string(), addr);
    }
    
    /// 注册数据转换器
    pub fn register_transformer(&mut self, name: &str, addr: Addr<dyn Actor>) {
        self.transformers.insert(name.to_string(), addr);
    }
    
    /// 注册数据加载器
    pub fn register_loader(&mut self, name: &str, addr: Addr<dyn Actor>) {
        self.loaders.insert(name.to_string(), addr);
    }
    
    /// 初始化提取器
    async fn create_extractor(&mut self) -> Result<(), String> {
        let extractor_config = &self.config.extractor;
        let options = extractor_config.options.clone();
        
        match crate::extractors::factory::create_extractor(&extractor_config.extractor_type, options) {
            Ok(extractor) => {
                self.extractors.insert(extractor_config.extractor_type.clone(), extractor);
                self.current_extractor = Some(extractor_config.extractor_type.clone());
                Ok(())
            },
            Err(e) => Err(format!("创建提取器失败: {}", e)),
        }
    }
    
    /// 初始化转换器
    async fn create_transformers(&mut self) -> Result<(), String> {
        for transformer_config in &self.config.transformers {
            let options = transformer_config.options.clone();
            
            match crate::transformers::factory::create_transformer(&transformer_config.transformer_type, options) {
                Ok(transformer) => {
                    self.transformers.insert(transformer_config.transformer_type.clone(), transformer);
                },
                Err(e) => return Err(format!("创建转换器失败: {}", e)),
            }
        }
        
        Ok(())
    }
    
    /// 初始化加载器
    async fn create_loader(&mut self) -> Result<(), String> {
        let loader_config = &self.config.loader;
        let options = loader_config.options.clone();
        
        match crate::loaders::factory::create_loader(&loader_config.loader_type, options) {
            Ok(loader) => {
                self.loaders.insert(loader_config.loader_type.clone(), loader);
                self.current_loader = Some(loader_config.loader_type.clone());
                Ok(())
            },
            Err(e) => Err(format!("创建加载器失败: {}", e)),
        }
    }
    
    /// 修改initialize_actors方法使用新的工厂方法
    async fn initialize_actors(&mut self) -> Result<(), String> {
        // 创建提取器
        if self.extractors.is_empty() {
            if let Err(e) = self.create_extractor().await {
                error!("初始化提取器失败: {}", e);
                return Err(e);
            }
        }
        
        // 创建转换器
        if self.transformers.is_empty() && !self.config.transformers.is_empty() {
            if let Err(e) = self.create_transformers().await {
                error!("初始化转换器失败: {}", e);
                return Err(e);
            }
        }
        
        // 创建加载器
        if self.loaders.is_empty() {
            if let Err(e) = self.create_loader().await {
                error!("初始化加载器失败: {}", e);
                return Err(e);
            }
        }
        
        Ok(())
    }
    
    /// 运行管道逻辑
    async fn run_pipeline(&mut self) -> Result<(), String> {
        // 初始化统计信息
        self.stats.start_time = Some(Utc::now());
        
        // 初始化组件
        if let Err(e) = self.initialize_actors().await {
            error!("初始化管道组件失败: {}", e);
            self.stats.error = Some(format!("初始化管道组件失败: {}", e));
            return Err(e);
        }
        
        info!("开始执行管道: {}", self.config.id);
        
        // 目前只是模拟ETL过程，真实实现需要更复杂的逻辑
        
        // 设置运行标志
        self.running = true;
        
        // 提取数据
        let extracted = match self.extract_data().await {
            Ok(data) => data,
            Err(e) => {
                error!("数据提取失败: {}", e);
                self.stats.error = Some(format!("数据提取失败: {}", e));
                return Err(e);
            }
        };
        
        // 转换数据
        let transformed = match self.transform_data(extracted).await {
            Ok(data) => data,
            Err(e) => {
                error!("数据转换失败: {}", e);
                self.stats.error = Some(format!("数据转换失败: {}", e));
                return Err(e);
            }
        };
        
        // 加载数据
        match self.load_data(transformed).await {
            Ok(count) => {
                self.stats.records_written += count;
                info!("数据加载成功，写入{}条记录", count);
            },
            Err(e) => {
                error!("数据加载失败: {}", e);
                self.stats.error = Some(format!("数据加载失败: {}", e));
                return Err(e);
            }
        }
        
        // 完成管道执行
        self.running = false;
        self.stats.end_time = Some(Utc::now());
        
        info!("管道执行完成: {}", self.config.id);
        Ok(())
    }
    
    /// 提取数据
    async fn extract_data(&mut self) -> Result<Vec<DataRecord>, String> {
        info!("开始提取数据: {}", self.config.id);
        
        // 模拟数据提取
        // 实际实现中应该调用注册的提取器Actor
        
        // 如果已经注册了提取器，则使用注册的提取器
        if let Some((name, extractor)) = self.extractors.iter().next() {
            self.current_extractor = Some(name.clone());
            
            // 构建提取参数
            let options = self.config.extractor.options.clone();
            
            // 调用提取器
            match extractor.send(ExtractData { options }).await {
                Ok(result) => match result {
                    Ok(records) => {
                        self.stats.records_read = records.len() as u64;
                        Ok(records)
                    },
                    Err(e) => {
                        error!("提取器执行失败: {}", e);
                        Err(e)
                    }
                },
                Err(e) => {
                    error!("发送ExtractData消息失败: {}", e);
                    Err(format!("发送ExtractData消息失败: {}", e))
                }
            }
        } else {
            // 如果没有注册提取器，则使用模拟数据
            let mut records = Vec::new();
            
            // 模拟生成一些测试数据
            for i in 0..100 {
                let mut record = DataRecord::new();
                record.set_field("id".to_string(), format!("{}", i));
                record.set_field("name".to_string(), format!("测试数据 {}", i));
                record.set_field("value".to_string(), format!("{}", i * 10));
                records.push(record);
            }
            
            self.stats.records_read = records.len() as u64;
            Ok(records)
        }
    }
    
    /// 转换数据
    async fn transform_data(&mut self, data: Vec<DataRecord>) -> Result<Vec<DataRecord>, String> {
        info!("开始转换数据: {}", self.config.id);
        
        // 如果没有配置转换器，则直接返回原始数据
        if self.config.transformers.is_empty() {
            return Ok(data);
        }
        
        // 如果已经注册了转换器，则使用注册的转换器
        let mut current_data = data;
        
        for (name, transformer) in &self.transformers {
            self.current_transformer = Some(name.clone());
            
            // 调用转换器
            match transformer.send(TransformData { records: current_data }).await {
                Ok(result) => match result {
                    Ok(records) => {
                        current_data = records;
                    },
                    Err(e) => {
                        error!("转换器执行失败: {}", e);
                        return Err(e);
                    }
                },
                Err(e) => {
                    error!("发送TransformData消息失败: {}", e);
                    return Err(format!("发送TransformData消息失败: {}", e));
                }
            }
        }
        
        // 记录失败的记录数
        self.stats.records_failed = (self.stats.records_read as usize - current_data.len()) as u64;
        
        Ok(current_data)
    }
    
    /// 加载数据
    async fn load_data(&mut self, data: Vec<DataRecord>) -> Result<u64, String> {
        info!("开始加载数据: {}", self.config.id);
        
        // 如果已经注册了加载器，则使用注册的加载器
        if let Some((name, loader)) = self.loaders.iter().next() {
            self.current_loader = Some(name.clone());
            
            // 调用加载器
            match loader.send(LoadData { records: data.clone() }).await {
                Ok(result) => match result {
                    Ok(count) => Ok(count),
                    Err(e) => {
                        error!("加载器执行失败: {}", e);
                        Err(e)
                    }
                },
                Err(e) => {
                    error!("发送LoadData消息失败: {}", e);
                    Err(format!("发送LoadData消息失败: {}", e))
                }
            }
        } else {
            // 如果没有注册加载器，则直接返回数据记录数
            info!("没有注册加载器，跳过加载阶段");
            Ok(data.len() as u64)
        }
    }
}

impl Actor for PipelineActor {
    type Context = Context<Self>;
    
    fn started(&mut self, _: &mut Self::Context) {
        debug!("管道Actor启动: {}", self.config.id);
    }
    
    fn stopped(&mut self, _: &mut Self::Context) {
        debug!("管道Actor停止: {}", self.config.id);
    }
}

impl Handler<StartPipeline> for PipelineActor {
    type Result = ResponseActFuture<Self, Result<(), String>>;
    
    fn handle(&mut self, _: StartPipeline, _: &mut Context<Self>) -> Self::Result {
        Box::pin(
            async move {
                self.run_pipeline().await
            }
            .into_actor(self)
        )
    }
}

impl Handler<StopPipeline> for PipelineActor {
    type Result = ();
    
    fn handle(&mut self, _: StopPipeline, _: &mut Context<Self>) -> Self::Result {
        if self.running {
            info!("停止管道执行: {}", self.config.id);
            self.running = false;
        }
    }
}

impl Handler<GetPipelineStats> for PipelineActor {
    type Result = JobStats;
    
    fn handle(&mut self, _: GetPipelineStats, _: &mut Context<Self>) -> Self::Result {
        self.stats.clone()
    }
} 