use crate::actors::messages::{ExtractData, InitializeAndRun, LoadData, TransformData};
use crate::config::{Config, Job, JobType};
use crate::extractors::factory::create_extractor;
use crate::loaders::factory::create_loader;
use crate::plugin::initialize_wasm_plugin_system;
use crate::transformers::factory::create_transformer;
use crate::types::{DataRecord, PipelineResult, PipelineStats};
use actix::prelude::*;
use anyhow::{anyhow, Result};
use log::{debug, error, info, warn};
use std::collections::HashMap;
use std::time::Instant;

/// 数据处理管道Actor
pub struct PipelineActor {
    /// 配置
    config: Config,
    /// 提取器
    extractors: HashMap<String, Addr<dyn crate::extractors::Extractor>>,
    /// 转换器
    transformers: HashMap<String, Addr<dyn crate::transformers::Transformer>>,
    /// 加载器
    loaders: HashMap<String, Addr<dyn crate::loaders::Loader>>,
    /// 统计信息
    stats: PipelineStats,
}

impl PipelineActor {
    /// 创建新的管道Actor
    pub fn new(config: Config) -> Self {
        Self {
            config,
            extractors: HashMap::new(),
            transformers: HashMap::new(),
            loaders: HashMap::new(),
            stats: PipelineStats::default(),
        }
    }

    /// 初始化WebAssembly插件系统
    fn initialize_wasm_plugins(&self) -> Result<()> {
        if let Some(wasm_config) = &self.config.wasm_plugins {
            if wasm_config.enabled {
                let plugins_dir = wasm_config.plugins_dir.as_deref().unwrap_or("./plugins");
                info!("初始化WebAssembly插件系统，目录: {}", plugins_dir);
                
                let count = initialize_wasm_plugin_system(plugins_dir)?;
                info!("已加载 {} 个WebAssembly插件", count);
            }
        }
        Ok(())
    }

    /// 创建提取器
    async fn create_extractor(&self, job: &Job) -> Result<Addr<dyn crate::extractors::Extractor>> {
        let extractor_type = job.extractor_type.as_ref()
            .ok_or_else(|| anyhow!("提取器任务未指定类型"))?;
        
        info!("创建提取器: {} (类型: {})", job.name, extractor_type);
        
        create_extractor(extractor_type, job.options.clone())
    }

    /// 创建转换器
    async fn create_transformers(&self, job: &Job) -> Result<Addr<dyn crate::transformers::Transformer>> {
        let transformer_type = job.transformer_type.as_ref()
            .ok_or_else(|| anyhow!("转换器任务未指定类型"))?;
        
        info!("创建转换器: {} (类型: {})", job.name, transformer_type);
        
        create_transformer(transformer_type, job.options.clone())
    }

    /// 创建加载器
    async fn create_loader(&self, job: &Job) -> Result<Addr<dyn crate::loaders::Loader>> {
        let loader_type = job.loader_type.as_ref()
            .ok_or_else(|| anyhow!("加载器任务未指定类型"))?;
        
        info!("创建加载器: {} (类型: {})", job.name, loader_type);
        
        create_loader(loader_type, job.options.clone())
    }

    /// 初始化actors
    async fn initialize_actors(&mut self) -> Result<()> {
        // 初始化WebAssembly插件系统
        self.initialize_wasm_plugins()?;
        
        // 创建所有actors
        for job in &self.config.jobs {
            match job.job_type {
                JobType::Extractor => {
                    if !self.extractors.contains_key(&job.name) {
                        let extractor = self.create_extractor(job).await?;
                        self.extractors.insert(job.name.clone(), extractor);
                    }
                }
                JobType::Transformer => {
                    if !self.transformers.contains_key(&job.name) {
                        let transformer = self.create_transformers(job).await?;
                        self.transformers.insert(job.name.clone(), transformer);
                    }
                }
                JobType::Loader => {
                    if !self.loaders.contains_key(&job.name) {
                        let loader = self.create_loader(job).await?;
                        self.loaders.insert(job.name.clone(), loader);
                    }
                }
            }
        }
        
        Ok(())
    }

    /// 查找起始任务
    fn find_start_job(&self) -> Option<&Job> {
        for job in &self.config.jobs {
            // 找到一个没有被其他任务引用的任务
            let is_referenced = self.config.jobs.iter().any(|j| {
                j.next.as_ref().map_or(false, |n| n == &job.name)
            });
            
            if !is_referenced {
                return Some(job);
            }
        }
        None
    }

    /// 执行管道
    async fn run_pipeline(&mut self) -> Result<PipelineStats> {
        let start_time = Instant::now();
        
        // 找到起始任务
        let Some(start_job) = self.find_start_job() else {
            return Err(anyhow!("找不到起始任务"));
        };
        
        info!("开始执行管道，起始任务: {}", start_job.name);
        
        let mut current_job = start_job;
        let mut records: Vec<DataRecord> = Vec::new();
        
        // 处理任务链
        loop {
            match current_job.job_type {
                JobType::Extractor => {
                    info!("执行提取任务: {}", current_job.name);
                    
                    if let Some(extractor) = self.extractors.get(&current_job.name) {
                        let start = Instant::now();
                        let extract_result = extractor
                            .send(ExtractData {
                                options: current_job.options.clone(),
                            })
                            .await??;
                        
                        records = extract_result;
                        
                        self.stats.extraction_time = start.elapsed();
                        self.stats.extracted_records = records.len();
                        
                        info!(
                            "提取完成，获取 {} 条记录，耗时 {:?}",
                            records.len(),
                            self.stats.extraction_time
                        );
                    } else {
                        return Err(anyhow!("找不到提取器: {}", current_job.name));
                    }
                }
                JobType::Transformer => {
                    info!("执行转换任务: {}", current_job.name);
                    
                    if let Some(transformer) = self.transformers.get(&current_job.name) {
                        let start = Instant::now();
                        let transform_result = transformer
                            .send(TransformData {
                                records: records.clone(),
                            })
                            .await??;
                        
                        records = transform_result;
                        
                        self.stats.transformation_time = start.elapsed();
                        self.stats.transformed_records = records.len();
                        
                        info!(
                            "转换完成，获取 {} 条记录，耗时 {:?}",
                            records.len(),
                            self.stats.transformation_time
                        );
                    } else {
                        return Err(anyhow!("找不到转换器: {}", current_job.name));
                    }
                }
                JobType::Loader => {
                    info!("执行加载任务: {}", current_job.name);
                    
                    if let Some(loader) = self.loaders.get(&current_job.name) {
                        let start = Instant::now();
                        let load_result = loader
                            .send(LoadData {
                                records: records.clone(),
                                options: current_job.options.clone(),
                            })
                            .await??;
                        
                        self.stats.loading_time = start.elapsed();
                        self.stats.loaded_records = load_result;
                        
                        info!(
                            "加载完成，加载 {} 条记录，耗时 {:?}",
                            load_result,
                            self.stats.loading_time
                        );
                    } else {
                        return Err(anyhow!("找不到加载器: {}", current_job.name));
                    }
                }
            }
            
            // 检查是否有下一个任务
            if let Some(next_name) = &current_job.next {
                let next_job = self.config.jobs
                    .iter()
                    .find(|j| &j.name == next_name)
                    .ok_or_else(|| anyhow!("找不到下一个任务: {}", next_name))?;
                
                current_job = next_job;
            } else {
                // 没有下一个任务，执行完成
                break;
            }
        }
        
        self.stats.total_time = start_time.elapsed();
        
        info!(
            "管道执行完成，总耗时 {:?}",
            self.stats.total_time
        );
        
        Ok(self.stats.clone())
    }
}

impl Actor for PipelineActor {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        info!("数据处理管道已启动");
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        info!("数据处理管道已停止");
    }
}

impl Handler<InitializeAndRun> for PipelineActor {
    type Result = ResponseFuture<Result<PipelineResult>>;

    fn handle(&mut self, _msg: InitializeAndRun, _ctx: &mut Self::Context) -> Self::Result {
        let config = self.config.clone();
        
        Box::pin(async move {
            let mut pipeline = PipelineActor::new(config);
            
            // 初始化
            pipeline.initialize_actors().await?;
            
            // 执行
            let stats = pipeline.run_pipeline().await?;
            
            Ok(Ok(stats))
        })
    }
} 