"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Trash2, RefreshCw, Database, Edit, Download, Loader2 } from "lucide-react";
import { getTableInfo, deleteTable } from "@/lib/api/table-management-service";
import { getTableData } from "@/lib/api/sql-service";
import { useLoading } from "@/contexts/loading-context";
import Link from "next/link";

export default function TableDetailPage({ params }: { params: { tableName: string } }) {
  const router = useRouter();
  const { tableName } = params;
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [dataCount, setDataCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { setModuleLoading } = useLoading();

  useEffect(() => {
    loadTableDetails();
  }, [tableName]);

  const loadTableDetails = async () => {
    setIsLoading(true);
    setModuleLoading('sqlite', true);
    
    try {
      // 获取表结构信息
      const info = await getTableInfo(tableName);
      setTableInfo(info);
      
      // 获取表数据
      const result = await getTableData(tableName, { limit: 50, offset: 0 });
      if (result.error) {
        toast.error(`Failed to load table data: ${result.error}`);
      } else {
        setTableData(result.data || []);
        setDataCount(result.count);
      }
    } catch (error) {
      console.error("Error loading table details:", error);
      toast.error("Failed to load table details");
    } finally {
      setIsLoading(false);
      setModuleLoading('sqlite', false);
    }
  };

  const handleDeleteTable = async () => {
    if (!confirm(`Are you sure you want to delete the table "${tableName}"?`)) {
      return;
    }
    
    setModuleLoading('sqlite', true);
    
    try {
      const result = await deleteTable(tableName);
      if (result.success) {
        toast.success(`Table "${tableName}" deleted successfully`);
        router.push("/dashboard/sqlite");
      } else {
        toast.error(`Failed to delete table: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting table:", error);
      toast.error("Failed to delete table");
    } finally {
      setModuleLoading('sqlite', false);
    }
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/sqlite">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{tableName}</h2>
            <p className="text-muted-foreground">
              View and manage table structure and data
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadTableDetails}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/sql-editor?table=${tableName}`}>
              <Edit className="mr-2 h-4 w-4" />
              Query
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="destructive" onClick={handleDeleteTable}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Table
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 表概述 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Rows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dataCount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatSize(tableInfo?.sizeBytes || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Modified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tableInfo?.lastModified ? new Date(tableInfo.lastModified).toLocaleDateString() : 'N/A'}</div>
              </CardContent>
            </Card>
          </div>

          {/* 表结构 */}
          <Card>
            <CardHeader>
              <CardTitle>Table Structure</CardTitle>
              <CardDescription>
                Columns and properties of this table
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Nullable</TableHead>
                    <TableHead className="text-center">Primary Key</TableHead>
                    <TableHead className="text-center">Unique</TableHead>
                    <TableHead>Default Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableInfo?.schema?.map((column: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{column.name}</TableCell>
                      <TableCell>{column.type}</TableCell>
                      <TableCell className="text-center">{column.nullable ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-center">{column.primary ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-center">{column.unique ? "Yes" : "No"}</TableCell>
                      <TableCell>{column.default || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {(!tableInfo?.schema || tableInfo.schema.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No column information available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 表数据预览 */}
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>
                First 50 rows of table data (Total: {dataCount.toLocaleString()} rows)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tableData.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(tableData[0]).map((key) => (
                          <TableHead key={key}>{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {Object.values(row).map((value: any, cellIndex) => (
                            <TableCell key={cellIndex}>
                              {value === null ? "NULL" : String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No data in this table</p>
                  <Button className="mt-4" variant="outline" asChild>
                    <Link href={`/dashboard/sql-editor?table=${tableName}&template=insert`}>
                      Insert Data
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 