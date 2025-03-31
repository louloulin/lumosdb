use anyhow::Result;
use colored::Colorize;
use rustyline::completion::{Completer, Pair};
use rustyline::error::ReadlineError;
use rustyline::highlight::{Highlighter, MatchingBracketHighlighter};
use rustyline::hint::{Hinter, HistoryHinter};
use rustyline::validate::Validator;
use rustyline::{CompletionType, Config, EditMode, Editor};
use rustyline_derive::{Completer, Helper, Highlighter, Hinter, Validator};
use std::borrow::Cow;
use std::collections::HashSet;

/// CLI助手，提供语法高亮、自动补全等功能
#[derive(Completer, Helper, Validator, Highlighter, Hinter)]
pub struct CliHelper {
    /// SQL关键字列表，用于自动补全
    keywords: HashSet<String>,
    /// 表名列表，用于自动补全
    tables: HashSet<String>,
    /// 列名列表，用于自动补全
    columns: HashSet<String>,
    /// 历史命令提示
    #[rustyline(Hinter)]
    history_hinter: HistoryHinter,
    /// 括号高亮
    #[rustyline(Highlighter)]
    bracket_highlighter: MatchingBracketHighlighter,
}

impl CliHelper {
    /// 创建新实例
    pub fn new() -> Self {
        // 初始化SQL关键字
        let mut keywords = HashSet::new();
        for keyword in &[
            "select", "from", "where", "group", "by", "having", "order",
            "limit", "offset", "insert", "into", "values", "update", "set",
            "delete", "create", "table", "drop", "alter", "add", "column",
            "index", "primary", "key", "foreign", "references", "constraint",
            "unique", "not", "null", "default", "check", "cascade", "restrict",
            "and", "or", "in", "between", "like", "is", "as", "union", "all",
            "case", "when", "then", "else", "end", "distinct", "inner", "outer",
            "left", "right", "full", "join", "on", "using", "exists",
        ] {
            keywords.insert(keyword.to_string());
        }
        
        Self {
            keywords,
            tables: HashSet::new(),
            columns: HashSet::new(),
            history_hinter: HistoryHinter::new(),
            bracket_highlighter: MatchingBracketHighlighter::new(),
        }
    }
    
    /// 更新表和列列表
    pub fn update_schema(&mut self, tables: Vec<String>, columns: Vec<String>) {
        self.tables = tables.into_iter().collect();
        self.columns = columns.into_iter().collect();
    }
}

impl Completer for CliHelper {
    type Candidate = Pair;
    
    fn complete(
        &self,
        line: &str,
        pos: usize,
        _ctx: &rustyline::Context<'_>,
    ) -> Result<(usize, Vec<Pair>), ReadlineError> {
        let line = line[..pos].to_lowercase();
        
        // 查找最后一个单词的开始位置
        let start = line
            .rfind(|c: char| c.is_whitespace() || c == ',' || c == '(' || c == '.')
            .map(|i| i + 1)
            .unwrap_or(0);
        
        let word = &line[start..];
        
        // 元命令补全
        if line.trim().starts_with('\\') {
            let meta_commands = [
                "\\help", "\\connect", "\\list", "\\describe", "\\export",
                "\\set", "\\source", "\\quit", "\\edit", "\\history",
                "\\format", "\\status", "\\clear",
            ];
            
            let candidates: Vec<Pair> = meta_commands
                .iter()
                .filter(|cmd| cmd.starts_with(&line.trim()))
                .map(|cmd| Pair {
                    display: cmd.to_string(),
                    replacement: cmd.to_string(),
                })
                .collect();
                
            return Ok((0, candidates));
        }
        
        // SQL补全
        let mut candidates = Vec::new();
        
        // 关键字补全
        for keyword in &self.keywords {
            if keyword.starts_with(word) {
                candidates.push(Pair {
                    display: keyword.to_uppercase(),
                    replacement: keyword.to_uppercase(),
                });
            }
        }
        
        // 表名补全
        for table in &self.tables {
            if table.to_lowercase().starts_with(word) {
                candidates.push(Pair {
                    display: table.clone(),
                    replacement: table.clone(),
                });
            }
        }
        
        // 列名补全
        for column in &self.columns {
            if column.to_lowercase().starts_with(word) {
                candidates.push(Pair {
                    display: column.clone(),
                    replacement: column.clone(),
                });
            }
        }
        
        Ok((start, candidates))
    }
}

impl Hinter for CliHelper {
    type Hint = String;
    
    fn hint(&self, line: &str, pos: usize, ctx: &rustyline::Context<'_>) -> Option<String> {
        // 如果是元命令，不提供历史提示
        if line.trim().starts_with('\\') {
            return None;
        }
        
        // 使用历史提示
        self.history_hinter.hint(line, pos, ctx)
    }
}

impl Highlighter for CliHelper {
    fn highlight<'l>(&self, line: &'l str, pos: usize) -> Cow<'l, str> {
        // 高亮SQL关键字
        if line.starts_with('\\') {
            // 元命令高亮
            let parts: Vec<&str> = line.splitn(2, ' ').collect();
            if parts.len() > 0 {
                let cmd = parts[0].to_string().blue().to_string();
                if parts.len() > 1 {
                    return Cow::Owned(format!("{} {}", cmd, parts[1]));
                } else {
                    return Cow::Owned(cmd);
                }
            }
        } else {
            // SQL关键字高亮
            let mut result = line.to_string();
            for keyword in &self.keywords {
                let upper = keyword.to_uppercase();
                
                // 简单替换，实际应用中应该使用正则表达式确保仅替换完整单词
                let pattern = format!("\\b{}\\b", regex::escape(keyword));
                if let Ok(re) = regex::Regex::new(&pattern) {
                    result = re.replace_all(&result, upper.blue().to_string()).to_string();
                }
            }
            
            return Cow::Owned(result);
        }
        
        // 默认匹配括号高亮
        self.bracket_highlighter.highlight(line, pos)
    }
    
    fn highlight_char(&self, line: &str, pos: usize) -> bool {
        self.bracket_highlighter.highlight_char(line, pos)
    }
}

impl Validator for CliHelper {
    fn validate(
        &self,
        ctx: &mut rustyline::validate::ValidationContext,
    ) -> rustyline::Result<rustyline::validate::ValidationResult> {
        // 不做特殊验证，始终允许
        Ok(rustyline::validate::ValidationResult::Valid(None))
    }
}

/// 创建Rustyline编辑器
pub fn create_editor(enable_completion: bool) -> Result<Editor<CliHelper>> {
    let config = Config::builder()
        .history_ignore_space(true)
        .completion_type(CompletionType::List)
        .edit_mode(EditMode::Emacs)
        .build();
        
    let mut editor = Editor::with_config(config)?;
    
    // 注册自定义助手
    let helper = CliHelper::new();
    editor.set_helper(Some(helper));
    
    // 禁用自动补全
    if !enable_completion {
        editor.set_completion_type(CompletionType::None);
    }
    
    Ok(editor)
}

/// 加载编辑器历史记录
pub fn load_history(editor: &mut Editor<CliHelper>, history_file: &str) -> Result<()> {
    if let Err(err) = editor.load_history(history_file) {
        // 如果是因为历史文件不存在导致的错误，忽略它
        if err.kind() != std::io::ErrorKind::NotFound {
            return Err(err.into());
        }
    }
    
    Ok(())
}

/// 保存编辑器历史记录
pub fn save_history(editor: &mut Editor<CliHelper>, history_file: &str) -> Result<()> {
    editor.save_history(history_file)?;
    Ok(())
} 