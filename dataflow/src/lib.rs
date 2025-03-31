pub mod actors;
pub mod config;
pub mod dag;
pub mod extractors;
pub mod loaders;
pub mod transformers;
pub mod types;
pub mod plugin;

#[cfg(feature = "vector-store")]
pub mod vector_store;

// Re-export common types for easier usage
pub use types::{DataRecord, ETLError};
pub use config::ETLConfig;
pub use dag::DAGManager;

// 导出公共类型
pub use types::{
    JobConfig, PipelineConfig, 
    ExtractorConfig, TransformerConfig, LoaderConfig,
    JobStatus, ExecutionStatus, JobStats,
};

// 导出配置相关
pub use config::ETLConfig;

// 导出DAG管理器
pub use dag::DAGManager;

// 导出Actor相关
pub use actors::dag_manager::DAGManagerActor;

// 导出API相关
pub use api::start_api_server;

// 导出插件系统
pub use plugin::{
    Plugin, PluginMetadata, PluginType, PluginManager,
    init_plugin_manager, with_plugin_manager
}; 

// 导出向量存储
#[cfg(feature = "vector-store")]
pub use vector_store::{
    VectorStore, VectorStoreConfig, VectorSearchResult,
    DistanceMetric, IndexType,
}; 