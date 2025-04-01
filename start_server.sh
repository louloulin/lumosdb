#!/bin/bash

# 设置环境变量
export LUMOS_HOST=127.0.0.1
export LUMOS_PORT=8080
export LUMOS_LOG_LEVEL=debug
export LUMOS_DB_PATH="lumos.db"
export LUMOS_VECTOR_DB_PATH="lumos_vector.db"

# 进入服务器目录
cd server

# 只构建不运行，检查是否有编译错误
echo "正在编译服务器..."
cargo build
if [ $? -ne 0 ]; then
    echo "编译失败！"
    exit 1
fi

# 运行服务器
echo "启动 LumosDB 服务器..."
cargo run 