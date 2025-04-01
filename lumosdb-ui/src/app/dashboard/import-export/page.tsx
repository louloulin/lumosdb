"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, ChevronDown, Download, FileSpreadsheet, FileText, Filter, Loader, UploadCloud } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

// 模拟API函数
const fetchTables = async () => {
  return new Promise<string[]>(resolve => {
    setTimeout(() => {
      resolve(['users', 'products', 'orders', 'categories', 'order_items', 'product_reviews']);
    }, 600);
  });
};

const fetchVectorCollections = async () => {
  return new Promise<string[]>(resolve => {
    setTimeout(() => {
      resolve(['product_embeddings', 'customer_profiles', 'support_questions']);
    }, 600);
  });
};

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  extensions: string[];
  icon: React.ReactNode;
  supportsTypes: ('sqlite' | 'vector' | 'duckdb')[];
}

const exportFormats: ExportFormat[] = [
  {
    id: 'csv',
    name: 'CSV',
    description: '逗号分隔值文件，适用于大多数数据工具',
    extensions: ['.csv'],
    icon: <FileSpreadsheet className="h-5 w-5" />,
    supportsTypes: ['sqlite', 'duckdb', 'vector']
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'JavaScript对象表示法，适用于API和Web应用',
    extensions: ['.json', '.jsonl'],
    icon: <FileText className="h-5 w-5" />,
    supportsTypes: ['sqlite', 'duckdb', 'vector']
  },
  {
    id: 'sql',
    name: 'SQL',
    description: 'SQL转储文件，包含创建表和数据的SQL语句',
    extensions: ['.sql'],
    icon: <FileText className="h-5 w-5" />,
    supportsTypes: ['sqlite']
  },
  {
    id: 'parquet',
    name: 'Parquet',
    description: '列式存储格式，适用于高效分析查询',
    extensions: ['.parquet'],
    icon: <FileText className="h-5 w-5" />,
    supportsTypes: ['duckdb']
  },
  {
    id: 'excel',
    name: 'Excel',
    description: '微软Excel电子表格格式',
    extensions: ['.xlsx'],
    icon: <FileSpreadsheet className="h-5 w-5" />,
    supportsTypes: ['sqlite', 'duckdb']
  }
];

export default function ImportExportPage() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState("import")
  
  // 导入状态
  const [importType, setImportType] = useState<string>("sqlite")
  const [importTarget, setImportTarget] = useState<string>("")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [createNewTable, setCreateNewTable] = useState(true)
  const [newTableName, setNewTableName] = useState("")
  const [importProgress, setImportProgress] = useState(0)
  const [importError, setImportError] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<string>("")
  
  // 导出状态
  const [exportType, setExportType] = useState<string>("sqlite")
  const [exportSource, setExportSource] = useState<string>("")
  const [exportFormat, setExportFormat] = useState<string>("csv")
  const [exportQuery, setExportQuery] = useState<string>("")
  const [includeHeaders, setIncludeHeaders] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState("")
  
  // 数据源列表
  const [tables, setTables] = useState<string[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)
  
  useEffect(() => {
    if (exportType === 'sqlite' || importType === 'sqlite') {
      loadTables();
    }
    if (exportType === 'vector' || importType === 'vector') {
      loadCollections();
    }
  }, [exportType, importType]);
  
  useEffect(() => {
    // 重置相关状态
    if (importType === 'sqlite') {
      setImportTarget("");
    } else if (importType === 'vector') {
      setImportTarget("");
    }
  }, [importType]);
  
  useEffect(() => {
    // 重置相关状态
    if (exportType === 'sqlite') {
      setExportSource("");
      setExportQuery("");
    } else if (exportType === 'vector') {
      setExportSource("");
      setExportQuery("");
    } else if (exportType === 'duckdb') {
      setExportQuery("SELECT * FROM ");
    }
  }, [exportType]);
  
  const loadTables = async () => {
    if (tables.length > 0) return;
    setIsLoadingTables(true);
    try {
      const tableList = await fetchTables();
      setTables(tableList);
    } catch (err) {
      console.error("Failed to load tables:", err);
    } finally {
      setIsLoadingTables(false);
    }
  };
  
  const loadCollections = async () => {
    if (collections.length > 0) return;
    setIsLoadingCollections(true);
    try {
      const collectionList = await fetchVectorCollections();
      setCollections(collectionList);
    } catch (err) {
      console.error("Failed to load vector collections:", err);
    } finally {
      setIsLoadingCollections(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImportFile(file);
      
      // 预览文件内容（仅限文本文件）
      if (file.type === 'text/csv' || file.type === 'application/json' || file.type.includes('text/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            // 显示前5000个字符
            setImportPreview(event.target.result.toString().substring(0, 5000));
          }
        };
        reader.readAsText(file);
      } else {
        setImportPreview("（无法预览二进制文件内容）");
      }
    }
  };
  
  const handleImport = async () => {
    if (!importFile) {
      setImportError("请选择要导入的文件");
      return;
    }
    
    if (!importTarget && !createNewTable) {
      setImportError("请选择目标表或集合");
      return;
    }
    
    if (createNewTable && !newTableName) {
      setImportError("请输入新表名称");
      return;
    }
    
    setImportError("");
    setIsImporting(true);
    setImportProgress(0);
    
    // 模拟导入进度
    const interval = setInterval(() => {
      setImportProgress((prev) => {
        const newProgress = prev + Math.random() * 20;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsImporting(false);
            setImportProgress(100);
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 500);
  };
  
  const handleExport = async () => {
    if (!exportSource && exportType !== 'duckdb') {
      setExportError("请选择要导出的数据源");
      return;
    }
    
    if (exportType === 'duckdb' && !exportQuery.trim()) {
      setExportError("请输入查询语句");
      return;
    }
    
    setExportError("");
    setIsExporting(true);
    
    // 模拟导出过程
    setTimeout(() => {
      setIsExporting(false);
      // 模拟文件下载
      const anchor = document.createElement('a');
      const filename = exportType === 'duckdb' 
        ? `query_result.${exportFormat}` 
        : `${exportSource}.${exportFormat}`;
      
      anchor.href = '#';
      anchor.download = filename;
      anchor.click();
    }, 2000);
  };
  
  const getExportFileName = () => {
    const format = exportFormats.find(f => f.id === exportFormat);
    const extension = format?.extensions[0] || '.txt';
    
    if (exportType === 'duckdb') {
      return `query_result${extension}`;
    } else {
      return exportSource ? `${exportSource}${extension}` : `export${extension}`;
    }
  };
  
  // 根据当前选择的类型过滤可用的导出格式
  const availableExportFormats = exportFormats.filter(
    format => format.supportsTypes.includes(exportType as any)
  );

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">数据导入与导出</h1>
        <p className="text-muted-foreground mt-2">
          在LumosDB中导入或导出数据
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="import">
            <ArrowUpFromLine className="mr-2 h-4 w-4" />
            数据导入
          </TabsTrigger>
          <TabsTrigger value="export">
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            数据导出
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>导入数据</CardTitle>
              <CardDescription>
                将数据从文件导入到LumosDB中
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {importError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{importError}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>数据类型</Label>
                    <Select value={importType} onValueChange={setImportType}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择数据类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sqlite">SQLite表</SelectItem>
                        <SelectItem value="vector">向量集合</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label>选择文件</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="file" 
                        onChange={handleFileChange}
                        accept=".csv,.json,.jsonl,.xlsx,.parquet,.sql"
                        className="flex-1"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Filter className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')!.accept = ".csv"}>
                            仅CSV文件
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')!.accept = ".json,.jsonl"}>
                            仅JSON文件
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')!.accept = ".xlsx"}>
                            仅Excel文件
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')!.accept = ".sql"}>
                            仅SQL文件
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')!.accept = ".csv,.json,.jsonl,.xlsx,.parquet,.sql"}>
                            所有支持的文件
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {importFile && (
                      <div className="text-sm text-muted-foreground mt-1">
                        已选择: {importFile.name} ({Math.round(importFile.size / 1024)} KB)
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="create-new-table">创建新表/集合</Label>
                      <Switch 
                        id="create-new-table" 
                        checked={createNewTable} 
                        onCheckedChange={setCreateNewTable}
                      />
                    </div>
                    
                    {createNewTable ? (
                      <div className="space-y-1.5">
                        <Label>新表/集合名称</Label>
                        <Input 
                          value={newTableName} 
                          onChange={(e) => setNewTableName(e.target.value)}
                          placeholder="输入新表名称"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label>目标表/集合</Label>
                        <Select value={importTarget} onValueChange={setImportTarget}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择目标表/集合" />
                          </SelectTrigger>
                          <SelectContent>
                            {importType === 'sqlite' ? (
                              isLoadingTables ? (
                                <div className="flex items-center justify-center py-2">
                                  <Loader className="h-4 w-4 animate-spin mr-2" />
                                  加载中...
                                </div>
                              ) : tables.length > 0 ? (
                                tables.map(table => (
                                  <SelectItem key={table} value={table}>{table}</SelectItem>
                                ))
                              ) : (
                                <div className="py-2 text-center text-sm text-muted-foreground">
                                  没有可用的表
                                </div>
                              )
                            ) : isLoadingCollections ? (
                              <div className="flex items-center justify-center py-2">
                                <Loader className="h-4 w-4 animate-spin mr-2" />
                                加载中...
                              </div>
                            ) : collections.length > 0 ? (
                              collections.map(collection => (
                                <SelectItem key={collection} value={collection}>{collection}</SelectItem>
                              ))
                            ) : (
                              <div className="py-2 text-center text-sm text-muted-foreground">
                                没有可用的向量集合
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>文件预览</Label>
                      {importFile && (
                        <Badge variant="outline" className="font-mono">
                          {importFile.type || "未知类型"}
                        </Badge>
                      )}
                    </div>
                    <div className="border rounded-md h-64 bg-muted/30">
                      <ScrollArea className="h-64 w-full">
                        {importPreview ? (
                          <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                            {importPreview}
                            {importPreview.length === 5000 && "...（已截断）"}
                          </pre>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <UploadCloud className="h-8 w-8 mb-2" />
                            <p>选择文件以查看预览</p>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-4">
              {isImporting && (
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between text-sm">
                    <span>导入进度</span>
                    <span>{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              )}
              <Button 
                onClick={handleImport} 
                disabled={isImporting || !importFile} 
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    正在导入...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    导入数据
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>导出数据</CardTitle>
              <CardDescription>
                将数据从LumosDB导出到文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {exportError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{exportError}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>数据类型</Label>
                    <Select value={exportType} onValueChange={setExportType}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择数据类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sqlite">SQLite表</SelectItem>
                        <SelectItem value="vector">向量集合</SelectItem>
                        <SelectItem value="duckdb">DuckDB查询</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {exportType !== 'duckdb' && (
                    <div>
                      <Label>数据源</Label>
                      <Select value={exportSource} onValueChange={setExportSource}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择数据源" />
                        </SelectTrigger>
                        <SelectContent>
                          {exportType === 'sqlite' ? (
                            isLoadingTables ? (
                              <div className="flex items-center justify-center py-2">
                                <Loader className="h-4 w-4 animate-spin mr-2" />
                                加载中...
                              </div>
                            ) : tables.length > 0 ? (
                              tables.map(table => (
                                <SelectItem key={table} value={table}>{table}</SelectItem>
                              ))
                            ) : (
                              <div className="py-2 text-center text-sm text-muted-foreground">
                                没有可用的表
                              </div>
                            )
                          ) : isLoadingCollections ? (
                            <div className="flex items-center justify-center py-2">
                              <Loader className="h-4 w-4 animate-spin mr-2" />
                              加载中...
                            </div>
                          ) : collections.length > 0 ? (
                            collections.map(collection => (
                              <SelectItem key={collection} value={collection}>{collection}</SelectItem>
                            ))
                          ) : (
                            <div className="py-2 text-center text-sm text-muted-foreground">
                              没有可用的向量集合
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {exportType === 'duckdb' && (
                    <div className="space-y-1.5">
                      <Label>SQL查询</Label>
                      <Textarea 
                        value={exportQuery} 
                        onChange={(e) => setExportQuery(e.target.value)}
                        placeholder="输入SQL查询语句"
                        className="h-32 font-mono text-sm"
                      />
                      <p className="text-sm text-muted-foreground">
                        查询结果将被导出为选定的格式
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <Label>导出格式</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                      {availableExportFormats.map((format) => (
                        <div
                          key={format.id}
                          className={`border rounded-md p-3 cursor-pointer flex items-start gap-2 hover:bg-accent/10 ${
                            exportFormat === format.id ? "bg-accent/10 border-accent" : ""
                          }`}
                          onClick={() => setExportFormat(format.id)}
                        >
                          <div className="text-muted-foreground shrink-0 pt-0.5">
                            {format.icon}
                          </div>
                          <div>
                            <div className="font-medium">{format.name}</div>
                            <div className="text-xs text-muted-foreground">{format.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {exportFormat === 'csv' && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="include-headers">包含标题行</Label>
                      <Switch 
                        id="include-headers" 
                        checked={includeHeaders} 
                        onCheckedChange={setIncludeHeaders}
                      />
                    </div>
                  )}
                </div>
                
                <div className="border rounded-md p-4 space-y-4">
                  <h3 className="text-sm font-medium">导出预览</h3>
                  
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">文件名</div>
                    <div className="text-sm font-mono bg-muted/30 px-2 py-1 rounded">
                      {getExportFileName()}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">数据类型</div>
                    <div className="text-sm">
                      {exportType === 'sqlite' && '数据库表'}
                      {exportType === 'vector' && '向量集合'}
                      {exportType === 'duckdb' && '分析查询结果'}
                    </div>
                  </div>
                  
                  {exportType !== 'duckdb' && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">数据源</div>
                      <div className="text-sm font-mono">
                        {exportSource || <span className="text-muted-foreground italic">（未选择）</span>}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">格式</div>
                    <div className="flex items-center gap-1">
                      {exportFormats.find(f => f.id === exportFormat)?.icon}
                      <span className="text-sm font-medium">
                        {exportFormats.find(f => f.id === exportFormat)?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({exportFormats.find(f => f.id === exportFormat)?.extensions.join(', ')})
                      </span>
                    </div>
                  </div>
                  
                  {exportFormat === 'csv' && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">选项</div>
                      <div className="text-sm">
                        标题行: {includeHeaders ? '是' : '否'}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <Alert className="bg-accent/10 border-accent">
                      <Download className="h-4 w-4" />
                      <AlertDescription>
                        点击下面的"导出数据"按钮开始导出过程，完成后文件将自动下载。
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleExport} 
                disabled={isExporting || (!exportSource && exportType !== 'duckdb') || (exportType === 'duckdb' && !exportQuery.trim())} 
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    正在导出...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    导出数据
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 