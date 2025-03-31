use crate::config::CliConfig;
use crate::connection::QueryResult;
use anyhow::Result;
use colored::Colorize;
use prettytable::{format, Table};
use std::io::{self, Write};

/// 输出格式
pub enum OutputFormat {
    /// 表格输出
    Table,
    /// JSON输出
    Json,
    /// CSV输出
    Csv,
    /// 垂直输出(每列一行)
    Vertical,
}

impl From<&str> for OutputFormat {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "json" => OutputFormat::Json,
            "csv" => OutputFormat::Csv,
            "vertical" | "vert" => OutputFormat::Vertical,
            _ => OutputFormat::Table,
        }
    }
}

/// 结果格式化器
pub struct ResultFormatter<'a> {
    /// 配置
    config: &'a CliConfig,
    /// 输出格式
    format: OutputFormat,
}

impl<'a> ResultFormatter<'a> {
    /// 创建新实例
    pub fn new(config: &'a CliConfig) -> Self {
        let format = OutputFormat::from(config.output_format.as_str());
        Self { config, format }
    }
    
    /// 设置输出格式
    pub fn with_format(mut self, format: OutputFormat) -> Self {
        self.format = format;
        self
    }
    
    /// 格式化并输出查询结果
    pub fn format_and_print(&self, result: &QueryResult) -> Result<()> {
        match self.format {
            OutputFormat::Table => self.print_table(result),
            OutputFormat::Json => self.print_json(result),
            OutputFormat::Csv => self.print_csv(result),
            OutputFormat::Vertical => self.print_vertical(result),
        }
    }
    
    /// 输出为表格形式
    fn print_table(&self, result: &QueryResult) -> Result<()> {
        let mut table = Table::new();
        
        // 设置表格样式
        let format = format::FormatBuilder::new()
            .column_separator('│')
            .borders('│')
            .separator(
                format::LinePosition::Top,
                format::LineSeparator::new('─', '┬', '┌', '┐'),
            )
            .separator(
                format::LinePosition::Title,
                format::LineSeparator::new('─', '┼', '├', '┤'),
            )
            .separator(
                format::LinePosition::Bottom,
                format::LineSeparator::new('─', '┴', '└', '┘'),
            )
            .padding(1, 1)
            .build();
        table.set_format(format);
        
        // 添加表头
        if self.config.show_headers {
            let headers = result.columns.iter().map(|c| {
                if self.config.use_colors {
                    c.bold().to_string()
                } else {
                    c.to_string()
                }
            }).collect::<Vec<_>>();
            table.set_titles(prettytable::row::Row::new(
                headers.iter().map(|h| prettytable::cell::Cell::new(h)).collect()
            ));
        }
        
        // 添加数据行
        for row in &result.rows {
            table.add_row(prettytable::row::Row::new(
                row.iter().map(|c| prettytable::cell::Cell::new(c)).collect()
            ));
        }
        
        // 打印表格
        table.printstd();
        
        // 打印受影响的行数和执行时间
        if self.config.show_timing {
            let exec_time = format!("{:.3} ms", result.execution_time.as_secs_f64() * 1000.0);
            
            if result.rows.is_empty() && result.affected_rows > 0 {
                println!("{} ({} ms)", 
                    format!("已修改 {} 行", result.affected_rows).green(),
                    exec_time
                );
            } else if !result.rows.is_empty() {
                println!("{} ({} ms)", 
                    format!("{} 行结果", result.rows.len()).green(),
                    exec_time
                );
            } else {
                println!("{} ({} ms)", 
                    "成功".green(),
                    exec_time
                );
            }
        }
        
        Ok(())
    }
    
    /// 输出为JSON形式
    fn print_json(&self, result: &QueryResult) -> Result<()> {
        let mut output = Vec::new();
        
        // 将结果转换为JSON格式
        for row in &result.rows {
            let mut obj = serde_json::Map::new();
            for (i, col) in result.columns.iter().enumerate() {
                if i < row.len() {
                    obj.insert(col.clone(), serde_json::Value::String(row[i].clone()));
                }
            }
            output.push(serde_json::Value::Object(obj));
        }
        
        // 打印JSON
        let json_str = serde_json::to_string_pretty(&output)?;
        println!("{}", json_str);
        
        // 打印执行时间
        if self.config.show_timing {
            let exec_time = format!("{:.3} ms", result.execution_time.as_secs_f64() * 1000.0);
            println!("\n{} 行结果 ({} ms)", output.len(), exec_time);
        }
        
        Ok(())
    }
    
    /// 输出为CSV形式
    fn print_csv(&self, result: &QueryResult) -> Result<()> {
        let mut wtr = csv::Writer::from_writer(io::stdout());
        
        // 写入表头
        if self.config.show_headers {
            wtr.write_record(&result.columns)?;
        }
        
        // 写入数据行
        for row in &result.rows {
            wtr.write_record(row)?;
        }
        
        wtr.flush()?;
        
        // 打印执行时间
        if self.config.show_timing {
            let exec_time = format!("{:.3} ms", result.execution_time.as_secs_f64() * 1000.0);
            eprintln!("\n{} 行结果 ({} ms)", result.rows.len(), exec_time);
        }
        
        Ok(())
    }
    
    /// 输出为垂直形式(每列一行)
    fn print_vertical(&self, result: &QueryResult) -> Result<()> {
        for (row_idx, row) in result.rows.iter().enumerate() {
            println!("{}", format!("*************************** {}. 行 ***************************", row_idx + 1).blue());
            
            for (col_idx, col) in result.columns.iter().enumerate() {
                if col_idx < row.len() {
                    let col_name = if self.config.use_colors {
                        format!("{}: ", col).green()
                    } else {
                        format!("{}: ", col)
                    };
                    
                    println!("{}{}", col_name, row[col_idx]);
                }
            }
            
            println!();
        }
        
        // 打印执行时间
        if self.config.show_timing {
            let exec_time = format!("{:.3} ms", result.execution_time.as_secs_f64() * 1000.0);
            println!("{} ({} ms)", 
                format!("{} 行结果", result.rows.len()).green(),
                exec_time
            );
        }
        
        Ok(())
    }
} 