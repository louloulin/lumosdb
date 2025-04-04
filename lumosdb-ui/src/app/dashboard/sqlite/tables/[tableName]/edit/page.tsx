"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getTableInfo } from "@/lib/api/table-management-service";
import { executeSQL } from "@/lib/api/sql-service";
import { useLoading } from "@/contexts/loading-context";
import Link from "next/link";
import TableNotFound from "@/components/table-not-found";

// SQLite数据类型
const dataTypes = [
  { value: "INTEGER", label: "INTEGER" },
  { value: "TEXT", label: "TEXT" },
  { value: "REAL", label: "REAL" },
  { value: "BLOB", label: "BLOB" },
  { value: "NUMERIC", label: "NUMERIC" },
  { value: "BOOLEAN", label: "BOOLEAN" },
  { value: "DATE", label: "DATE" },
  { value: "DATETIME", label: "DATETIME" },
  { value: "TIME", label: "TIME" },
];

// 列结构类型
interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primary: boolean;
  unique: boolean;
  default?: string;
  originalName?: string; // 用于跟踪原始列名（重命名时使用）
}

// 新列类型
interface NewColumn {
  name: string;
  type: string;
  nullable: boolean;
  primary: boolean;
  unique: boolean;
  default?: string;
}

export default function EditTablePage({ params }: { params: { tableName: string } }) {
  const router = useRouter();
  const { tableName } = params;
  const [isLoading, setIsLoading] = useState(true);
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [newColumns, setNewColumns] = useState<NewColumn[]>([]);
  const [columnsToDelete, setColumnsToDelete] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sqlPreview, setSqlPreview] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("structure");
  const { setModuleLoading } = useLoading();

  // 加载表信息
  useEffect(() => {
    const loadTableInfo = async () => {
      setIsLoading(true);
      setModuleLoading('sqlite', true);
      
      try {
        const info = await getTableInfo(tableName);
        if (!info) {
          setError(`Table "${tableName}" not found`);
          return;
        }
        
        setTableInfo(info);
        
        // 转换列信息为编辑格式
        const columnsList = info.schema.map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          primary: col.primary,
          unique: col.unique,
          default: col.default,
          originalName: col.name, // 保存原始列名
        }));
        
        setColumns(columnsList);
        updateSqlPreview(columnsList, [], []);
      } catch (error) {
        console.error("Error loading table info:", error);
        setError("Failed to load table information");
      } finally {
        setIsLoading(false);
        setModuleLoading('sqlite', false);
      }
    };
    
    loadTableInfo();
  }, [tableName, setModuleLoading]);

  // 更新列信息
  const updateColumn = (index: number, field: keyof ColumnInfo, value: any) => {
    const updatedColumns = [...columns];
    updatedColumns[index] = { ...updatedColumns[index], [field]: value };
    setColumns(updatedColumns);
    updateSqlPreview(updatedColumns, newColumns, columnsToDelete);
  };

  // 添加新列
  const addNewColumn = () => {
    const newColumn: NewColumn = {
      name: "",
      type: "TEXT",
      nullable: true,
      primary: false,
      unique: false,
    };
    
    setNewColumns([...newColumns, newColumn]);
    updateSqlPreview(columns, [...newColumns, newColumn], columnsToDelete);
  };

  // 更新新列信息
  const updateNewColumn = (index: number, field: keyof NewColumn, value: any) => {
    const updatedNewColumns = [...newColumns];
    updatedNewColumns[index] = { ...updatedNewColumns[index], [field]: value };
    setNewColumns(updatedNewColumns);
    updateSqlPreview(columns, updatedNewColumns, columnsToDelete);
  };

  // 移除新列
  const removeNewColumn = (index: number) => {
    const updatedNewColumns = newColumns.filter((_, i) => i !== index);
    setNewColumns(updatedNewColumns);
    updateSqlPreview(columns, updatedNewColumns, columnsToDelete);
  };

  // 标记要删除的列
  const markColumnForDeletion = (columnName: string) => {
    const updatedColumnsToDelete = [...columnsToDelete, columnName];
    setColumnsToDelete(updatedColumnsToDelete);
    updateSqlPreview(columns, newColumns, updatedColumnsToDelete);
  };

  // 取消删除列的标记
  const unmarkColumnForDeletion = (columnName: string) => {
    const updatedColumnsToDelete = columnsToDelete.filter(name => name !== columnName);
    setColumnsToDelete(updatedColumnsToDelete);
    updateSqlPreview(columns, newColumns, updatedColumnsToDelete);
  };

  // 更新SQL预览
  const updateSqlPreview = (
    currentColumns: ColumnInfo[], 
    currentNewColumns: NewColumn[], 
    currentColumnsToDelete: string[]
  ) => {
    const statements: string[] = [];
    
    // 添加新列
    for (const newCol of currentNewColumns) {
      if (!newCol.name) continue;
      
      let statement = `ALTER TABLE "${tableName}" ADD COLUMN "${newCol.name}" ${newCol.type}`;
      
      if (!newCol.nullable) statement += " NOT NULL";
      if (newCol.unique) statement += " UNIQUE";
      if (newCol.default) statement += ` DEFAULT ${newCol.default}`;
      
      statements.push(statement + ";");
    }
    
    // 修改列（SQLite不直接支持ALTER COLUMN，需要多步操作）
    const modifiedColumns = currentColumns.filter(col => 
      col.name !== col.originalName || 
      !currentColumnsToDelete.includes(col.name)
    );
    
    if (modifiedColumns.length > 0 || currentColumnsToDelete.length > 0) {
      // 在SQLite中修改列的最简单方法是通过创建新表并复制数据
      statements.push(`-- Column modifications require creating a new table and copying data`);
      statements.push(`-- This preview is simplified - actual execution will handle data preservation\n`);
      
      // 显示要删除的列
      if (currentColumnsToDelete.length > 0) {
        statements.push(`-- Columns to be deleted: ${currentColumnsToDelete.join(', ')}`);
      }
      
      // 显示要重命名的列
      const renamedColumns = currentColumns.filter(col => col.name !== col.originalName && !currentColumnsToDelete.includes(col.originalName!));
      if (renamedColumns.length > 0) {
        for (const col of renamedColumns) {
          statements.push(`-- Rename column "${col.originalName}" to "${col.name}"`);
        }
      }
    }
    
    setSqlPreview(statements.join("\n"));
  };

  // 提交表结构更改
  const submitChanges = async () => {
    // 验证表结构更改
    if (!validateChanges()) {
      return;
    }
    
    setModuleLoading('sqlite', true);
    
    try {
      // 对于SQLite，我们需要执行一系列操作来更改表结构
      
      // 1. 添加新列（可以直接通过ALTER TABLE添加）
      for (const newCol of newColumns) {
        if (!newCol.name) continue;
        
        let sql = `ALTER TABLE "${tableName}" ADD COLUMN "${newCol.name}" ${newCol.type}`;
        
        if (!newCol.nullable) sql += " NOT NULL";
        if (newCol.unique) sql += " UNIQUE";
        if (newCol.default) sql += ` DEFAULT ${newCol.default}`;
        
        const result = await executeSQL(sql);
        if (result.error) {
          throw new Error(`Failed to add column "${newCol.name}": ${result.error}`);
        }
      }
      
      // 2. 处理列修改和删除
      // 这需要通过创建新表、复制数据、删除旧表、重命名新表来完成
      const hasModifications = columns.some(col => col.name !== col.originalName) || columnsToDelete.length > 0;
      
      if (hasModifications) {
        // 创建临时表
        const tempTableName = `${tableName}_temp_${Date.now()}`;
        
        // 构建新表结构
        const activeColumns = columns.filter(col => !columnsToDelete.includes(col.originalName!));
        const columnDefs = activeColumns.map(col => {
          let def = `"${col.name}" ${col.type}`;
          if (col.primary) def += " PRIMARY KEY";
          if (!col.nullable) def += " NOT NULL";
          if (col.unique) def += " UNIQUE";
          if (col.default) def += ` DEFAULT ${col.default}`;
          return def;
        }).join(", ");
        
        // 创建新表
        let createTableSql = `CREATE TABLE "${tempTableName}" (${columnDefs})`;
        let result = await executeSQL(createTableSql);
        if (result.error) {
          throw new Error(`Failed to create temporary table: ${result.error}`);
        }
        
        // 构建复制数据的SQL
        const sourceColumns = activeColumns.map(col => `"${col.originalName}"`).join(", ");
        const targetColumns = activeColumns.map(col => `"${col.name}"`).join(", ");
        
        // 复制数据
        const copyDataSql = `INSERT INTO "${tempTableName}" (${targetColumns}) SELECT ${sourceColumns} FROM "${tableName}"`;
        result = await executeSQL(copyDataSql);
        if (result.error) {
          // 清理临时表并抛出错误
          await executeSQL(`DROP TABLE IF EXISTS "${tempTableName}"`);
          throw new Error(`Failed to copy data to temporary table: ${result.error}`);
        }
        
        // 删除旧表
        result = await executeSQL(`DROP TABLE "${tableName}"`);
        if (result.error) {
          throw new Error(`Failed to drop original table: ${result.error}`);
        }
        
        // 重命名新表
        result = await executeSQL(`ALTER TABLE "${tempTableName}" RENAME TO "${tableName}"`);
        if (result.error) {
          throw new Error(`Failed to rename temporary table: ${result.error}`);
        }
      }
      
      toast.success("Table structure updated successfully");
      router.push(`/dashboard/sqlite/tables/${tableName}`);
    } catch (error) {
      console.error("Error updating table structure:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      toast.error("Failed to update table structure");
    } finally {
      setModuleLoading('sqlite', false);
    }
  };

  // 验证表结构更改
  const validateChanges = (): boolean => {
    // 检查新列是否有名称
    for (const newCol of newColumns) {
      if (newCol.name.trim() === "") {
        setError("All new columns must have names");
        return false;
      }
    }
    
    // 检查修改后的列名是否有重复
    const columnNames = new Set();
    for (const col of columns) {
      if (columnsToDelete.includes(col.originalName!)) continue;
      
      if (columnNames.has(col.name)) {
        setError(`Duplicate column name: ${col.name}`);
        return false;
      }
      columnNames.add(col.name);
    }
    
    // 检查新列名是否与现有列名冲突
    for (const newCol of newColumns) {
      if (columnNames.has(newCol.name)) {
        setError(`New column name conflicts with existing column: ${newCol.name}`);
        return false;
      }
      columnNames.add(newCol.name);
    }
    
    return true;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/sqlite/tables/${tableName}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Edit Table: {tableName}</h2>
            <p className="text-muted-foreground">
              Modify table structure and properties
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={submitChanges}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <TableNotFound 
          tableName={tableName} 
          errorMessage={error}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="structure">Table Structure</TabsTrigger>
              <TabsTrigger value="sql">SQL Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="structure" className="space-y-4">
              {/* 现有列 */}
              <Card>
                <CardHeader>
                  <CardTitle>Existing Columns</CardTitle>
                  <CardDescription>
                    Modify properties of existing columns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="w-[100px] text-center">Not Null</TableHead>
                          <TableHead className="w-[100px] text-center">Primary Key</TableHead>
                          <TableHead className="w-[100px] text-center">Unique</TableHead>
                          <TableHead>Default Value</TableHead>
                          <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {columns.map((column, index) => (
                          <TableRow 
                            key={index} 
                            className={columnsToDelete.includes(column.originalName!) ? "opacity-50 bg-red-50 dark:bg-red-900/10" : ""}
                          >
                            <TableCell>
                              <Input
                                value={column.name}
                                onChange={(e) => updateColumn(index, "name", e.target.value)}
                                disabled={columnsToDelete.includes(column.originalName!)}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={column.type}
                                onValueChange={(value) => updateColumn(index, "type", value)}
                                disabled={columnsToDelete.includes(column.originalName!)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {dataTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={column.nullable === false}
                                onCheckedChange={(checked) => updateColumn(index, "nullable", !checked)}
                                disabled={columnsToDelete.includes(column.originalName!) || column.primary}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={column.primary}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    // 更新该列为主键并设置为非空
                                    updateColumn(index, "primary", true);
                                    updateColumn(index, "nullable", false);
                                    
                                    // 移除其他列的主键标志
                                    columns.forEach((_, i) => {
                                      if (i !== index) {
                                        updateColumn(i, "primary", false);
                                      }
                                    });
                                  } else {
                                    updateColumn(index, "primary", false);
                                  }
                                }}
                                disabled={columnsToDelete.includes(column.originalName!)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={column.unique}
                                onCheckedChange={(checked) => updateColumn(index, "unique", checked)}
                                disabled={columnsToDelete.includes(column.originalName!) || column.primary}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={column.default || ""}
                                onChange={(e) => updateColumn(index, "default", e.target.value)}
                                placeholder="Default value"
                                disabled={columnsToDelete.includes(column.originalName!)}
                              />
                            </TableCell>
                            <TableCell>
                              {columnsToDelete.includes(column.originalName!) ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => unmarkColumnForDeletion(column.originalName!)}
                                >
                                  Restore
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => markColumnForDeletion(column.originalName!)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              {/* 添加新列 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Add New Columns</CardTitle>
                    <CardDescription>
                      Define new columns for your table
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={addNewColumn}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Column
                  </Button>
                </CardHeader>
                <CardContent>
                  {newColumns.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="w-[100px] text-center">Not Null</TableHead>
                            <TableHead className="w-[100px] text-center">Primary Key</TableHead>
                            <TableHead className="w-[100px] text-center">Unique</TableHead>
                            <TableHead>Default Value</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {newColumns.map((column, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Input
                                  value={column.name}
                                  onChange={(e) => updateNewColumn(index, "name", e.target.value)}
                                  placeholder="Column name"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={column.type}
                                  onValueChange={(value) => updateNewColumn(index, "type", value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {dataTypes.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={column.nullable === false}
                                  onCheckedChange={(checked) => updateNewColumn(index, "nullable", !checked)}
                                  disabled={column.primary}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={column.primary}
                                  onCheckedChange={(checked) => {
                                    updateNewColumn(index, "primary", checked);
                                    if (checked) {
                                      updateNewColumn(index, "nullable", false);
                                    }
                                  }}
                                  disabled={columns.some(col => col.primary)}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={column.unique}
                                  onCheckedChange={(checked) => updateNewColumn(index, "unique", checked)}
                                  disabled={column.primary}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={column.default || ""}
                                  onChange={(e) => updateNewColumn(index, "default", e.target.value)}
                                  placeholder="Default value"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeNewColumn(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No new columns added yet</p>
                      <Button className="mt-2" variant="outline" size="sm" onClick={addNewColumn}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Column
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <div className="flex justify-center">
                <Button onClick={submitChanges}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="sql" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>SQL Preview</CardTitle>
                  <CardDescription>
                    Preview of the SQL statements that will be executed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono overflow-x-auto">
                    <pre>{sqlPreview || "-- No changes to preview"}</pre>
                  </div>
                  
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                      <span>
                        SQLite has limited support for altering tables. Complex changes like column deletion or modification
                        will be implemented by creating a new table, copying data, and renaming the table.
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
} 