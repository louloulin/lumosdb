mod cli;
mod commands;
mod config;
mod connection;
mod output;
mod repl;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use config::CliConfig;
use std::path::PathBuf;

/// LumosDB 命令行工具 - 用于与Lumos-DB进行交互的CLI工具
#[derive(Parser)]
#[command(name = "lumosdb")]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// 配置文件路径
    #[arg(short, long, value_name = "FILE")]
    config: Option<PathBuf>,

    /// 连接字符串，格式: [sqlite|duckdb]://path/to/database
    #[arg(short, long)]
    connect: Option<String>,

    /// 启用调试输出
    #[arg(short, long)]
    debug: bool,

    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// 执行SQL查询并退出
    Exec {
        /// SQL查询语句
        #[arg(required = true)]
        query: String,
    },
    /// 批量执行SQL文件
    File {
        /// SQL文件路径
        #[arg(required = true)]
        path: PathBuf,
    },
}

fn main() -> Result<()> {
    // 初始化日志
    env_logger::init();

    // 解析命令行参数
    let cli = Cli::parse();

    // 设置调试模式
    if cli.debug {
        std::env::set_var("RUST_LOG", "debug");
    }

    // 加载配置
    let config = CliConfig::load(cli.config.as_deref())?;

    // 处理命令
    match &cli.command {
        Some(Commands::Exec { query }) => {
            execute_query(&config, &cli.connect, query)?;
        }
        Some(Commands::File { path }) => {
            execute_file(&config, &cli.connect, path)?;
        }
        None => {
            // 启动交互式REPL
            start_repl(&config, &cli.connect)?;
        }
    }

    Ok(())
}

/// 执行单个SQL查询
fn execute_query(config: &CliConfig, connect: &Option<String>, query: &str) -> Result<()> {
    let mut repl = repl::Repl::new(config, connect.clone())?;
    repl.execute_query(query)
}

/// 执行SQL文件
fn execute_file(config: &CliConfig, connect: &Option<String>, path: &PathBuf) -> Result<()> {
    let mut repl = repl::Repl::new(config, connect.clone())?;
    repl.execute_file(path)
}

/// 启动交互式REPL
fn start_repl(config: &CliConfig, connect: &Option<String>) -> Result<()> {
    let mut repl = repl::Repl::new(config, connect.clone())?;
    repl.run().context("REPL执行失败")
} 