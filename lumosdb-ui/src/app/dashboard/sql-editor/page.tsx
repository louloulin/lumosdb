"use client";

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  Download, 
  Save, 
  PlayCircle, 
  Clock, 
  BookmarkIcon, 
  Share2, 
  Copy, 
  XCircle, 
  Settings,
  FileText,
  Check
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Editor, { Monaco } from "@monaco-editor/react"
import type { editor, languages, Position, CancellationToken } from "monaco-editor"
import { toast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"

// SQL sample statements
const sqlSamples = {
  selectAll: "-- 查询表中所有数据\nSELECT * FROM users LIMIT 10;",
  createTable: `-- 创建新表
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
  insert: `-- 插入数据
INSERT INTO products (name, price, description)
VALUES 
  ('Product A', 19.99, 'This is product A description'),
  ('Product B', 29.99, 'This is product B description'),
  ('Product C', 39.99, 'This is product C description');`,
  join: `-- 联表查询
SELECT 
  u.id, 
  u.username, 
  o.order_id, 
  o.total_amount
FROM 
  users u
JOIN 
  orders o ON u.id = o.user_id
WHERE 
  o.total_amount > 100
ORDER BY 
  o.total_amount DESC
LIMIT 20;`,
  update: `-- 更新数据
UPDATE products
SET 
  price = price * 1.1,
  updated_at = CURRENT_TIMESTAMP
WHERE 
  category_id = 5;`,
  delete: `-- 删除数据
DELETE FROM products 
WHERE created_at < date('now', '-1 year');`
}

// Types for saved queries and history
interface SavedQuery {
  id: number;
  name: string;
  sql: string;
}

interface QueryHistoryItem {
  id: number;
  sql: string;
  timestamp: string;
  duration: string;
  status: 'success' | 'error';
}

interface QueryResult {
  success: boolean;
  data?: Record<string, string | number>[];
  columns?: string[];
  rowCount?: number;
  rowsAffected?: number;
  duration: string;
  error?: string;
}

// Saved queries mock data
const savedQueries: SavedQuery[] = [
  { id: 1, name: "用户统计查询", sql: "SELECT count(*) as total_users FROM users;" },
  { id: 2, name: "最近订单", sql: "SELECT * FROM orders ORDER BY created_at DESC LIMIT 20;" },
  { id: 3, name: "商品库存查询", sql: "SELECT p.name, p.price, i.quantity FROM products p JOIN inventory i ON p.id = i.product_id;" },
  { id: 4, name: "活跃用户", sql: "SELECT user_id, COUNT(*) as login_count FROM user_logins WHERE login_time > date('now', '-30 day') GROUP BY user_id ORDER BY login_count DESC LIMIT 10;" },
]

// Query history mock data
const queryHistory: QueryHistoryItem[] = [
  { id: 1, sql: "SELECT * FROM users LIMIT 10;", timestamp: "2023-06-10 14:32", duration: "42ms", status: "success" },
  { id: 2, sql: "UPDATE products SET price = price * 1.1 WHERE category_id = 2;", timestamp: "2023-06-10 11:15", duration: "124ms", status: "success" },
  { id: 3, sql: "SELECT * FROM orders WHERE status = 'pending';", timestamp: "2023-06-09 16:45", duration: "56ms", status: "success" },
  { id: 4, sql: "SELECT * FROM non_existent_table;", timestamp: "2023-06-09 10:22", duration: "12ms", status: "error" },
]

// Mock function to execute SQL query
const executeSql = async (sql: string): Promise<QueryResult> => {
  // Simulate network request
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Mock responses for different queries
  if (sql.toLowerCase().includes("select * from users")) {
    return {
      success: true,
      data: [
        { id: 1, username: "user1", email: "user1@example.com", created_at: "2023-01-15" },
        { id: 2, username: "user2", email: "user2@example.com", created_at: "2023-02-20" },
        { id: 3, username: "user3", email: "user3@example.com", created_at: "2023-03-05" },
        { id: 4, username: "user4", email: "user4@example.com", created_at: "2023-04-10" },
        { id: 5, username: "user5", email: "user5@example.com", created_at: "2023-05-15" },
      ],
      columns: ["id", "username", "email", "created_at"],
      rowCount: 5,
      duration: "63ms"
    };
  } else if (sql.toLowerCase().includes("non_existent_table")) {
    return {
      success: false,
      error: "Error: no such table: non_existent_table",
      duration: "12ms"
    };
  } else if (sql.toLowerCase().includes("insert") || sql.toLowerCase().includes("update") || sql.toLowerCase().includes("delete")) {
    return {
      success: true,
      rowsAffected: 3,
      duration: "124ms"
    };
  } else {
    // Default response with mock data
    return {
      success: true,
      data: [
        { column1: "value1", column2: "value2" },
        { column1: "value3", column2: "value4" },
      ],
      columns: ["column1", "column2"],
      rowCount: 2,
      duration: "45ms"
    };
  }
};

// Configure Monaco editor on load
const configureMonaco = (monaco: Monaco) => {
  // Define SQLite keywords for syntax highlighting
  monaco.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems: (model: editor.ITextModel, position: Position, context: languages.CompletionContext, token: CancellationToken) => {
      const sqlKeywords = [
        ...['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'HAVING'],
        ...['INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE INDEX', 'DROP INDEX'],
        ...['AND', 'OR', 'NOT', 'NULL', 'IS NULL', 'IS NOT NULL', 'LIKE', 'IN', 'BETWEEN', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'],
        ...['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'AS', 'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT'],
        ...['INTEGER', 'TEXT', 'REAL', 'BLOB', 'NULL', 'PRIMARY KEY', 'AUTOINCREMENT', 'UNIQUE', 'DEFAULT', 'REFERENCES', 'CHECK']
      ];
      
      // These parameters are required by Monaco's API
      void context;
      void token;
      
      const wordRange = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: wordRange.startColumn,
        endColumn: wordRange.endColumn
      };
      
      const suggestions = sqlKeywords.map(keyword => ({
        label: keyword,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: keyword,
        range
      }));
      
      return { suggestions };
    }
  });
  
  // Add custom SQLite theme
  monaco.editor.defineTheme('sqliteTheme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '#569cd6', fontStyle: 'bold' },
      { token: 'operator', foreground: '#d4d4d4' },
      { token: 'string', foreground: '#ce9178' },
      { token: 'number', foreground: '#b5cea8' },
      { token: 'comment', foreground: '#6A9955', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editorCursor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2d2d2d',
      'editor.selectionBackground': '#264f78',
      'editor.selectionHighlightBackground': '#222222'
    }
  });
};

export default function SQLEditorPage() {
  const [sql, setSql] = useState<string>(sqlSamples.selectAll);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("editor");
  const [currentDBConnection, setCurrentDBConnection] = useState<string>("main");
  const [editorTheme, setEditorTheme] = useState<string>("sqliteTheme");
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };
  
  const handleExecuteQuery = async () => {
    if (!sql.trim()) {
      toast({
        title: "查询为空",
        description: "请输入 SQL 查询语句",
        variant: "destructive",
      });
      return;
    }
    
    setIsExecuting(true);
    try {
      const queryResult = await executeSql(sql);
      setResult(queryResult);
      
      if (queryResult.success) {
        toast({
          title: "查询执行成功",
          description: `用时 ${queryResult.duration}`,
        });
      } else {
        toast({
          title: "查询执行失败",
          description: queryResult.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
        duration: "0ms"
      });
      
      toast({
        title: "查询执行失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };
  
  const handleLoadSavedQuery = (querySql: string) => {
    setSql(querySql);
    setActiveTab("editor");
  };
  
  const handleLoadHistoryQuery = (querySql: string) => {
    setSql(querySql);
    setActiveTab("editor");
  };
  
  const handleLoadSample = (sampleKey: keyof typeof sqlSamples) => {
    setSql(sqlSamples[sampleKey]);
  };
  
  const handleSaveQuery = () => {
    // In a real app, this would save to the database
    toast({
      title: "查询已保存",
      description: "您的 SQL 查询已成功保存",
    });
  };
  
  const handleExportResults = () => {
    if (!result?.data) return;
    
    try {
      // Convert result data to CSV
      const columns = result.columns || [];
      const rows = result.data;
      
      let csv = columns.join(",") + "\n";
      rows.forEach((row) => {
        csv += columns.map((col: string) => {
          const value = row[col];
          // Handle values that need quotes (contains comma, newline, or quote)
          return typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(",") + "\n";
      });
      
      // Create and download the file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `query_results_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "导出成功",
        description: "查询结果已导出为 CSV 文件",
      });
    } catch (error) {
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "导出结果时出错",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto space-y-6 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">SQL 编辑器</h1>
          <p className="text-muted-foreground">执行 SQL 查询并分析结果</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={currentDBConnection} onValueChange={setCurrentDBConnection}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择数据库连接" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main">Main Database</SelectItem>
              <SelectItem value="temp">Temporary DB</SelectItem>
              <SelectItem value="file">External File DB</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={() => setEditorTheme(editorTheme === "sqliteTheme" ? "vs-light" : "sqliteTheme")}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">编辑器</TabsTrigger>
          <TabsTrigger value="saved">已保存查询</TabsTrigger>
          <TabsTrigger value="history">查询历史</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor" className="space-y-4">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>SQL 查询</CardTitle>
                  <div className="flex gap-2">
                    <Select 
                      onValueChange={(value) => handleLoadSample(value as keyof typeof sqlSamples)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="加载示例" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="selectAll">查询全部</SelectItem>
                        <SelectItem value="createTable">创建表</SelectItem>
                        <SelectItem value="insert">插入数据</SelectItem>
                        <SelectItem value="join">联表查询</SelectItem>
                        <SelectItem value="update">更新数据</SelectItem>
                        <SelectItem value="delete">删除数据</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <Editor
                    height="300px"
                    language="sql"
                    value={sql}
                    onChange={(value) => setSql(value || "")}
                    theme={editorTheme}
                    onMount={handleEditorDidMount}
                    beforeMount={configureMonaco}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      tabSize: 2,
                      wordWrap: "on",
                      automaticLayout: true,
                    }}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex gap-2">
                  <Button onClick={handleSaveQuery} variant="outline" size="sm">
                    <Save className="mr-2 h-4 w-4" />
                    保存查询
                  </Button>
                  <Button onClick={() => setSql("")} variant="outline" size="sm">
                    <XCircle className="mr-2 h-4 w-4" />
                    清空
                  </Button>
                </div>
                <Button 
                  onClick={handleExecuteQuery} 
                  disabled={isExecuting}
                  className="min-w-[120px]"
                >
                  {isExecuting ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      执行中...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      执行查询
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            {result && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>查询结果</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {result.success ? (
                        result.rowsAffected !== undefined ? (
                          <span>已影响 {result.rowsAffected} 行 · {result.duration}</span>
                        ) : (
                          <span>{result.rowCount} 行 · {result.duration}</span>
                        )
                      ) : (
                        <span className="text-destructive">查询失败</span>
                      )}
                    </div>
                  </div>
                  <Separator />
                </CardHeader>
                <CardContent>
                  {result.success ? (
                    result.data ? (
                      <div className="rounded-md border overflow-hidden">
                        <ScrollArea className="max-h-[400px]">
                          <div className="w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                              <thead className="[&_tr]:border-b bg-muted/50">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                  {result.columns?.map((column: string) => (
                                    <th key={column} className="h-10 px-4 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0">
                                      {column}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="[&_tr:last-child]:border-0">
                                {result.data.map((row, index: number) => (
                                  <tr key={index} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    {result.columns?.map((column: string) => (
                                      <td key={`${index}-${column}`} className="p-2 px-4 align-middle [&:has([role=checkbox])]:pr-0">
                                        {row[column]?.toString() || "NULL"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </ScrollArea>
                      </div>
                    ) : (
                      <Alert>
                        <Check className="h-4 w-4" />
                        <AlertDescription>
                          查询执行成功。{result.rowsAffected !== undefined && `已影响 ${result.rowsAffected} 行。`}
                        </AlertDescription>
                      </Alert>
                    )
                  ) : (
                    <Alert className="bg-destructive/10 text-destructive">
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  {result.success && result.data && (
                    <Button onClick={handleExportResults} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      导出结果
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>已保存查询</CardTitle>
              <CardDescription>您可以保存常用的 SQL 查询以便快速访问</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savedQueries.map((query) => (
                  <div
                    key={query.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <BookmarkIcon className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">{query.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 font-mono">{query.sql}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleLoadSavedQuery(query.sql)}>
                        <FileText className="h-4 w-4" />
                        <span className="sr-only">打开</span>
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Share2 className="h-4 w-4" />
                        <span className="sr-only">分享</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>查询历史</CardTitle>
              <CardDescription>您最近执行的 SQL 查询历史记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {queryHistory.map((query) => (
                  <div
                    key={query.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className={`h-5 w-5 ${query.status === "success" ? "text-primary" : "text-destructive"}`} />
                      <div>
                        <div className="font-mono line-clamp-1">{query.sql}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                          <span>{query.timestamp}</span>
                          <span>{query.duration}</span>
                          <span className={query.status === "success" ? "text-green-500" : "text-red-500"}>
                            {query.status === "success" ? "成功" : "失败"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleLoadHistoryQuery(query.sql)}>
                        <FileText className="h-4 w-4" />
                        <span className="sr-only">打开</span>
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">复制</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 