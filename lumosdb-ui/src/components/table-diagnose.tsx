import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Check, Loader2, Database, ShieldAlert, FileCode, Hash } from "lucide-react";
import { executeSQLQuery } from "@/lib/api/sql-service";

interface TableDiagnoseProps {
  tableName: string;
}

export default function TableDiagnose({ tableName }: TableDiagnoseProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<{
    tableExists: boolean;
    hasPermission: boolean;
    canQuery: boolean;
    specialCharsHandled: boolean;
    sqliteInfo: string;
    completed: boolean;
    error?: string;
  } | null>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnosticResults(null);
    
    const results = {
      tableExists: false,
      hasPermission: false,
      canQuery: false,
      specialCharsHandled: false,
      sqliteInfo: "",
      completed: false,
    };
    
    try {
      // 检查表是否存在 - 注意使用executeSQLQuery而非executeSQL
      const existsQuery = `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`;
      const existsResult = await executeSQLQuery(existsQuery);
      
      if (!existsResult.error && existsResult.data && existsResult.data.length > 0) {
        results.tableExists = true;
        
        // 检查表结构
        const structureQuery = `PRAGMA table_info("${tableName}")`;
        const structureResult = await executeSQLQuery(structureQuery);
        
        results.hasPermission = !structureResult.error;
        
        // 尝试查询表
        const queryTest = `SELECT * FROM "${tableName}" LIMIT 1`;
        const queryResult = await executeSQLQuery(queryTest);
        
        results.canQuery = !queryResult.error;
        
        // 测试特殊字符处理
        // 使用带引号和不带引号的表名分别尝试，验证特殊字符处理能力
        if (results.canQuery) {
          const unquotedQuery = `SELECT * FROM ${tableName} LIMIT 1`;
          const quotedQuery = `SELECT * FROM "${tableName}" LIMIT 1`;
          
          try {
            // 两种方式都尝试
            const unquotedResult = await executeSQLQuery(unquotedQuery);
            const quotedResult = await executeSQLQuery(quotedQuery);
            
            // 如果至少一个查询成功，则特殊字符处理正常
            results.specialCharsHandled = !unquotedResult.error || !quotedResult.error;
          } catch (error) {
            // 如果带引号的查询失败，说明特殊字符处理有问题
            results.specialCharsHandled = false;
          }
        }
      }
      
      // 获取SQLite版本和配置信息
      const versionQuery = `SELECT sqlite_version() as version, * FROM pragma_compile_options LIMIT 10`;
      const versionResult = await executeSQLQuery(versionQuery);
      
      if (!versionResult.error && versionResult.data && versionResult.data.length > 0) {
        const versionInfo = versionResult.data[0];
        results.sqliteInfo = `SQLite ${versionInfo?.version || 'Unknown'}`;
      }
      
      results.completed = true;
      setDiagnosticResults(results);
    } catch (error) {
      setDiagnosticResults({
        ...results,
        completed: true,
        error: error instanceof Error ? error.message : "诊断过程中发生未知错误"
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="mr-2 h-5 w-5" />
          表诊断工具
        </CardTitle>
        <CardDescription>
          诊断并排查表 &quot;{tableName}&quot; 的可访问性问题
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!diagnosticResults && !isRunning && (
          <div className="text-center py-4 text-muted-foreground">
            <p>点击下方按钮运行诊断，检查表的可访问性问题</p>
          </div>
        )}
        
        {isRunning && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>正在诊断...</span>
          </div>
        )}
        
        {diagnosticResults && diagnosticResults.completed && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg flex items-center ${
                diagnosticResults.tableExists 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                {diagnosticResults.tableExists ? (
                  <Check className="mr-2 h-5 w-5" />
                ) : (
                  <AlertCircle className="mr-2 h-5 w-5" />
                )}
                <div>
                  <p className="font-medium">表存在</p>
                  <p className="text-sm">
                    {diagnosticResults.tableExists 
                      ? '表在数据库中存在' 
                      : '表在数据库中不存在'}
                  </p>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg flex items-center ${
                diagnosticResults.hasPermission 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                {diagnosticResults.hasPermission ? (
                  <Check className="mr-2 h-5 w-5" />
                ) : (
                  <ShieldAlert className="mr-2 h-5 w-5" />
                )}
                <div>
                  <p className="font-medium">权限检查</p>
                  <p className="text-sm">
                    {diagnosticResults.hasPermission 
                      ? '有足够权限访问此表' 
                      : '没有足够权限访问此表'}
                  </p>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg flex items-center ${
                diagnosticResults.canQuery 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                {diagnosticResults.canQuery ? (
                  <Check className="mr-2 h-5 w-5" />
                ) : (
                  <FileCode className="mr-2 h-5 w-5" />
                )}
                <div>
                  <p className="font-medium">查询测试</p>
                  <p className="text-sm">
                    {diagnosticResults.canQuery 
                      ? '可以成功查询表数据' 
                      : '无法查询表数据'}
                  </p>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg flex items-center ${
                diagnosticResults.specialCharsHandled 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                  : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
              }`}>
                {diagnosticResults.specialCharsHandled ? (
                  <Check className="mr-2 h-5 w-5" />
                ) : (
                  <Hash className="mr-2 h-5 w-5" />
                )}
                <div>
                  <p className="font-medium">特殊字符</p>
                  <p className="text-sm">
                    {diagnosticResults.specialCharsHandled 
                      ? '特殊字符处理正常' 
                      : '表名可能包含特殊字符'}
                  </p>
                </div>
              </div>
            </div>
            
            {diagnosticResults.error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                <p className="font-medium">诊断过程中发生错误:</p>
                <p className="text-sm">{diagnosticResults.error}</p>
              </div>
            )}
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900/20 rounded-lg">
              <p className="font-medium">诊断结果分析:</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                {!diagnosticResults.tableExists && "表不存在于数据库中，请检查表名是否正确或尝试创建表。"}
                {diagnosticResults.tableExists && !diagnosticResults.hasPermission && "表存在但无法访问其结构，可能是权限问题。"}
                {diagnosticResults.tableExists && diagnosticResults.hasPermission && !diagnosticResults.canQuery && "可以访问表结构但无法查询数据，可能是表损坏或查询语法问题。"}
                {diagnosticResults.tableExists && diagnosticResults.hasPermission && diagnosticResults.canQuery && !diagnosticResults.specialCharsHandled && "表名可能包含特殊字符，请确保在SQL查询中使用双引号包裹表名。"}
                {diagnosticResults.tableExists && diagnosticResults.hasPermission && diagnosticResults.canQuery && diagnosticResults.specialCharsHandled && "表结构和数据均可正常访问，如仍有问题，可能是应用程序层面的问题。"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                SQLite信息: {diagnosticResults.sqliteInfo || "未知"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          variant="outline"
          onClick={runDiagnostics}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              诊断中...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              运行诊断
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 