// 导出WebAssembly插件加载器
mod wasmtime_loader;
pub use wasmtime_loader::{
    WasmPluginManager, WasmPluginInstance, 
    init_wasm_plugin_manager, with_wasm_plugin_manager, has_wasm_plugin
};

// WebAssembly插件适配器
mod adapter;
pub use adapter::{
    list_wasm_plugins, list_wasm_plugins_by_type
};

// 注意: 保留libloading的动态库加载器，以向后兼容
#[cfg(feature = "plugins")]
mod dynamic_loader;
#[cfg(feature = "plugins")]
pub use dynamic_loader::DynamicPluginLoader;

// 通用插件类型和功能
pub mod common;

// 明确区分两种PluginType
pub use common::{Plugin, Extractor, Transformer, Loader, PluginMetadata};
pub use common::PluginType as CommonPluginType;
pub use wasmtime_loader::PluginType as WasmPluginType;

// 用于验证WIT接口兼容性
pub mod wit_validator; 