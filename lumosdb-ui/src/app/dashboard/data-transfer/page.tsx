"use client"

import { useState, useEffect, useRef } from "react"
import { Metadata } from "next"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DocWrapper } from "@/components/doc-wrapper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, Download, Database, Loader2, HardDrive, CheckCircle, X, Grid3X3 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { 
  DatabaseType,
  DataFormat,
  getSupportedFormats,
  getAvailableTables,
  importData,
  exportData,
  getDataTransferHistory,
  DataTransferHistoryItem
} from "@/lib/api/data-transfer-service"
import { useLoading } from "@/contexts/loading-context"

export const metadata: Metadata = {
  title: "Data Transfer | LumosDB",
  description: "Import and export data in various formats",
}

export default function DataTransferPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setModuleLoading } = useLoading();
  
  const [activeTab, setActiveTab] = useState("import")
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseType>(DatabaseType.SQLITE)
  const [selectedTable, setSelectedTable] = useState("")
  const [selectedFormat, setSelectedFormat] = useState<DataFormat>(DataFormat.CSV)
  const [availableTables, setAvailableTables] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null)
  const [exportSuccess, setExportSuccess] = useState<boolean | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importHistory, setImportHistory] = useState<DataTransferHistoryItem[]>([])
  const [exportHistory, setExportHistory] = useState<DataTransferHistoryItem[]>([])
  const [includeHeaders, setIncludeHeaders] = useState(true)
  const [includeSchema, setIncludeSchema] = useState(true)
  
  // 支持的格式
  const supportedFormats = getSupportedFormats(selectedDatabase);
  
  // 加载表
  useEffect(() => {
    const loadTables = async () => {
      try {
        setModuleLoading('data-transfer', true);
        const tables = await getAvailableTables(selectedDatabase);
        setAvailableTables(tables);
        // 重置选中的表
        setSelectedTable('');
      } catch (error) {
        console.error('获取表失败:', error);
        toast({
          title: '获取表失败',
          description: '无法获取数据库表，请稍后重试',
          variant: 'destructive'
        });
      } finally {
        setModuleLoading('data-transfer', false);
      }
    };
    
    loadTables();
  }, [selectedDatabase, setModuleLoading, toast]);
  
  // 加载历史记录
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getDataTransferHistory();
        
        // 分离导入和导出历史
        setImportHistory(history.filter(item => item.operationType === 'import'));
        setExportHistory(history.filter(item => item.operationType === 'export'));
      } catch (error) {
        console.error('获取历史记录失败:', error);
      }
    };
    
    loadHistory();
  }, []);
  
  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      
      // 根据文件扩展名自动选择格式
      const fileName = e.target.files[0].name;
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      if (extension) {
        const format = extension as DataFormat;
        if (Object.values(DataFormat).includes(format)) {
          setSelectedFormat(format);
        }
      }
    }
  };
  
  // 处理文件上传
  const handleImport = async () => {
    if (!selectedFile || !selectedTable) {
      toast({
        title: '导入错误',
        description: '请选择文件和目标表',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setProgress(0);
      setImportSuccess(null);
      
      const result = await importData(selectedFile, {
        databaseType: selectedDatabase,
        tableName: selectedTable,
        format: selectedFormat,
        hasHeaders: includeHeaders,
        createTable: true,
        onProgress: setProgress
      });
      
      setImportSuccess(result.success);
      
      if (result.success) {
        toast({
          title: '导入成功',
          description: `成功导入 ${result.rowsImported} 条记录到 ${selectedTable}`,
        });
        
        // 重置文件选择
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast({
          title: '导入失败',
          description: result.error || '导入过程中发生错误',
          variant: 'destructive'
        });
      }
      
      // 重新加载历史记录
      const history = await getDataTransferHistory();
      setImportHistory(history.filter(item => item.operationType === 'import'));
    } catch (error) {
      console.error('导入失败:', error);
      setImportSuccess(false);
      toast({
        title: '导入失败',
        description: '导入过程中发生错误',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理导出
  const handleExport = async () => {
    if (!selectedTable) {
      toast({
        title: '导出错误',
        description: '请选择要导出的表',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setProgress(0);
      setExportSuccess(null);
      
      const result = await exportData({
        databaseType: selectedDatabase,
        tableName: selectedTable,
        format: selectedFormat,
        includeHeaders,
        includeSchema: selectedDatabase !== DatabaseType.VECTORS && includeSchema,
        onProgress: setProgress
      });
      
      setExportSuccess(result.success);
      
      if (result.success) {
        toast({
          title: '导出成功',
          description: `已导出 ${selectedTable} 表数据`,
        });
      } else {
        toast({
          title: '导出失败',
          description: result.error || '导出过程中发生错误',
          variant: 'destructive'
        });
      }
      
      // 重新加载历史记录
      const history = await getDataTransferHistory();
      setExportHistory(history.filter(item => item.operationType === 'export'));
    } catch (error) {
      console.error('导出失败:', error);
      setExportSuccess(false);
      toast({
        title: '导出失败',
        description: '导出过程中发生错误',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 获取适当的数据库图标
  const getDatabaseIcon = () => {
    switch (selectedDatabase) {
      case DatabaseType.SQLITE:
        return <Database className="h-4 w-4" />;
      case DatabaseType.DUCKDB:
        return <HardDrive className="h-4 w-4" />;
      case DatabaseType.VECTORS:
        return <Grid3X3 className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };
  
  return (
    <DocWrapper className="space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">数据传输</h2>
      </div>

      <Tabs defaultValue="import" onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="import" className="flex items-center">
            <Upload className="mr-2 h-4 w-4" />
            导入数据
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            导出数据
          </TabsTrigger>
        </TabsList>
        
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "import" ? "导入数据" : "导出数据"}
            </CardTitle>
            <CardDescription>
              {activeTab === "import" 
                ? "从文件导入数据到选定的数据库和表"
                : "从选定的数据库和表导出数据到文件"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="databaseType">数据库类型</Label>
              <Select 
                value={selectedDatabase} 
                onValueChange={(value) => setSelectedDatabase(value as DatabaseType)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择数据库类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DatabaseType.SQLITE}>SQLite数据库</SelectItem>
                  <SelectItem value={DatabaseType.DUCKDB}>DuckDB分析引擎</SelectItem>
                  <SelectItem value={DatabaseType.VECTORS}>向量数据库</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tableName">表名</Label>
              <Select 
                value={selectedTable} 
                onValueChange={setSelectedTable}
                disabled={isLoading || availableTables.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={availableTables.length === 0 ? "加载中..." : "选择表名"} />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((table) => (
                    <SelectItem key={table} value={table}>{table}</SelectItem>
                  ))}
                  {activeTab === "import" && (
                    <SelectItem value="__new_table__">创建新表</SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              {selectedTable === "__new_table__" && (
                <div className="pt-2">
                  <Label htmlFor="newTableName">新表名</Label>
                  <Input id="newTableName" placeholder="输入新表名" className="mt-1" />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="format">文件格式</Label>
              <Select 
                value={selectedFormat} 
                onValueChange={(value) => setSelectedFormat(value as DataFormat)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择文件格式" />
                </SelectTrigger>
                <SelectContent>
                  {supportedFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {activeTab === "import" && (
              <div className="space-y-2">
                <Label>文件</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept={`.${selectedFormat}`}
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
                {selectedFile && (
                  <div className="text-sm text-muted-foreground">
                    已选择: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </div>
                )}
                
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="hasHeaders"
                    checked={includeHeaders}
                    onChange={(e) => setIncludeHeaders(e.target.checked)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="hasHeaders" className="text-sm cursor-pointer">
                    文件包含表头
                  </Label>
                </div>
              </div>
            )}
            
            {activeTab === "export" && (
              <div className="space-y-2">
                <Label htmlFor="options">导出选项</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="includeHeaders"
                        checked={includeHeaders}
                        onChange={(e) => setIncludeHeaders(e.target.checked)}
                        disabled={isLoading}
                      />
                      <Label htmlFor="includeHeaders" className="text-sm cursor-pointer">
                        包含表头
                      </Label>
                    </div>
                  </div>
                  
                  {selectedDatabase !== DatabaseType.VECTORS && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="includeSchema"
                          checked={includeSchema}
                          onChange={(e) => setIncludeSchema(e.target.checked)}
                          disabled={isLoading}
                        />
                        <Label htmlFor="includeSchema" className="text-sm cursor-pointer">
                          包含模式定义
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {isLoading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>进度</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            
            {importSuccess === true && (
              <Alert className="bg-green-50 border-green-500">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>导入成功</AlertTitle>
                <AlertDescription>
                  数据已成功导入到 {selectedDatabase}.{selectedTable}
                </AlertDescription>
              </Alert>
            )}
            
            {importSuccess === false && (
              <Alert className="bg-red-50 border-red-500">
                <X className="h-4 w-4 text-red-600" />
                <AlertTitle>导入失败</AlertTitle>
                <AlertDescription>
                  导入数据时出错，请检查文件格式并重试。
                </AlertDescription>
              </Alert>
            )}
            
            {exportSuccess === true && (
              <Alert className="bg-green-50 border-green-500">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>导出成功</AlertTitle>
                <AlertDescription>
                  数据已成功导出，文件下载已开始
                </AlertDescription>
              </Alert>
            )}
            
            {exportSuccess === false && (
              <Alert className="bg-red-50 border-red-500">
                <X className="h-4 w-4 text-red-600" />
                <AlertTitle>导出失败</AlertTitle>
                <AlertDescription>
                  导出数据时出错，请稍后重试。
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center">
              {getDatabaseIcon()}
              <Badge variant="outline" className="ml-2">
                {selectedDatabase} / {selectedTable || "未选择表"}
              </Badge>
              <Badge variant="outline" className="ml-2">
                {selectedFormat.toUpperCase()}
              </Badge>
            </div>
            
            <Button 
              onClick={activeTab === "import" ? handleImport : handleExport}
              disabled={isLoading || !selectedTable || (activeTab === "import" && !selectedFile)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {activeTab === "import" ? "导入中..." : "导出中..."}
                </>
              ) : (
                <>
                  {activeTab === "import" ? (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      导入
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      导出
                    </>
                  )}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">最近导入记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {importHistory.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    暂无导入记录
                  </div>
                ) : (
                  importHistory.slice(0, 5).map((operation) => (
                    <div key={operation.id} className="flex flex-col sm:flex-row sm:items-center justify-between border p-3 rounded-md">
                      <div className="flex items-center">
                        <Upload className="h-4 w-4 mr-2 text-blue-500" />
                        <div>
                          <div className="font-medium text-sm">
                            导入到 {operation.databaseType}.{operation.tableName}
                          </div>
                          <div className="text-xs text-muted-foreground">{new Date(operation.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center mt-2 sm:mt-0">
                        <Badge variant="outline" className="mr-2">{operation.format.toUpperCase()}</Badge>
                        {operation.success ? (
                          <Badge className="bg-green-500">{operation.rowsAffected} 行</Badge>
                        ) : (
                          <Badge className="bg-red-500">失败</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">最近导出记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {exportHistory.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    暂无导出记录
                  </div>
                ) : (
                  exportHistory.slice(0, 5).map((operation) => (
                    <div key={operation.id} className="flex flex-col sm:flex-row sm:items-center justify-between border p-3 rounded-md">
                      <div className="flex items-center">
                        <Download className="h-4 w-4 mr-2 text-green-500" />
                        <div>
                          <div className="font-medium text-sm">
                            从 {operation.databaseType}.{operation.tableName} 导出
                          </div>
                          <div className="text-xs text-muted-foreground">{new Date(operation.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center mt-2 sm:mt-0">
                        <Badge variant="outline" className="mr-2">{operation.format.toUpperCase()}</Badge>
                        {operation.success ? (
                          <Badge className="bg-green-500">{operation.rowsAffected} 行</Badge>
                        ) : (
                          <Badge className="bg-red-500">失败</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DocWrapper>
  );
} 