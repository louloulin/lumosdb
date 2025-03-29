// 导出WebAssembly插件加载器
mod wasmtime_loader;
pub use wasmtime_loader::*;

// WebAssembly插件适配器
mod adapter;
pub use adapter::*;

// 注意: 保留libloading的动态库加载器，以向后兼容
#[cfg(feature = "plugins")]
mod dynamic_loader;
#[cfg(feature = "plugins")]
pub use dynamic_loader::*;

// 通用插件类型和功能
pub mod common;
pub use common::*;

// 用于验证WIT接口兼容性
pub mod wit_validator; 