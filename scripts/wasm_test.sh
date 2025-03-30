#!/bin/bash
# 简单的WebAssembly插件验证脚本

echo "========================================="
echo "    WebAssembly插件系统验证              "
echo "========================================="

# 确保目录存在
mkdir -p plugins

# 运行简单测试
echo "运行简单的WebAssembly测试..."
cargo run --example simple_wasm_test

echo "验证完成!" 