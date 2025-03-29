@echo off
setlocal EnableDelayedExpansion

echo === Lumos DataFlow 插件构建和测试脚本 ===

REM 检查MongoDB插件目录
set MONGODB_DIR=mongodb
if not exist %MONGODB_DIR% (
    echo 错误: 未找到MongoDB插件目录
    exit /b 1
)

REM 创建插件目录
set PLUGINS_DIR=..\..\target\plugins
if not exist %PLUGINS_DIR% mkdir %PLUGINS_DIR%

echo 1. 构建MongoDB插件
cd %MONGODB_DIR%
cargo build
if %ERRORLEVEL% neq 0 (
    echo 错误: MongoDB插件构建失败
    exit /b 1
)
echo √ MongoDB插件构建完成

REM 复制插件到目标目录
echo 2. 安装插件到测试目录
set PLUGIN_FILE=target\debug\lumos_dataflow_plugin_mongodb.dll
if not exist %PLUGIN_FILE% (
    echo 错误: 插件文件未找到: %PLUGIN_FILE%
    exit /b 1
)

copy %PLUGIN_FILE% ..\..\%PLUGINS_DIR%\
echo √ 插件复制到 %PLUGINS_DIR%

cd ..\..

echo 3. 运行插件测试
set LUMOS_PLUGINS_DIR=%CD%\target\plugins
cargo run --example test_plugins

echo === 测试完成 === 