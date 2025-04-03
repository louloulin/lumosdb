"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileDown, RefreshCw, Search, Trash2, Database, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getTables, deleteTable, truncateTable } from "@/lib/api/table-management-service";
import { useLoading } from "@/contexts/loading-context";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 定义表的列信息类型
interface ColumnInfo {
  name: string;
  type: string;
  primary: boolean;
  nullable: boolean;
}

export default function SQLitePage() {
  const [tableList, setTableList] = useState<Array<{
    name: string;
    rowCount: number;
    sizeBytes: number;
    schema: ColumnInfo[];
    createdAt?: string;
    lastModified?: string;
  }>>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [truncateDialogOpen, setTruncateDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const { setModuleLoading } = useLoading();

  // 获取表列表
  const fetchTables = async () => {
    setIsLoading(true);
    setModuleLoading('sqlite', true);
    try {
      const tables = await getTables();
      setTableList(tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      toast.error("Failed to load tables");
    } finally {
      setIsLoading(false);
      setModuleLoading('sqlite', false);
    }
  };

  // 删除表
  const handleDeleteTable = async () => {
    if (!selectedTable) return;
    
    setModuleLoading('sqlite', true);
    const result = await deleteTable(selectedTable);
    setModuleLoading('sqlite', false);
    
    if (result.success) {
      toast.success(`Table &quot;${selectedTable}&quot; deleted successfully`);
      fetchTables();
    } else {
      toast.error(`Failed to delete table: ${result.error}`);
    }
    
    setDeleteDialogOpen(false);
  };

  // 清空表
  const handleTruncateTable = async () => {
    if (!selectedTable) return;
    
    setModuleLoading('sqlite', true);
    const result = await truncateTable(selectedTable);
    setModuleLoading('sqlite', false);
    
    if (result.success) {
      toast.success(`Table &quot;${selectedTable}&quot; data cleared successfully`);
      fetchTables();
    } else {
      toast.error(`Failed to clear table data: ${result.error}`);
    }
    
    setTruncateDialogOpen(false);
  };

  // 过滤表
  const filteredTables = tableList.filter(table => 
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    fetchTables();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SQLite Tables</h2>
          <p className="text-muted-foreground">
            Browse and manage SQLite tables in your database.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/sqlite/tables/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Table
            </Link>
          </Button>
          <Button variant="outline" onClick={fetchTables}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Tables</CardTitle>
              <CardDescription>
                Manage your SQLite database tables
              </CardDescription>
            </div>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input 
                type="search" 
                placeholder="Search tables..."
                className="max-w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" size="icon" variant="ghost">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tableList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No tables found in your database</p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard/sqlite/tables/create">
                  Create your first table
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Columns</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTables.map((table) => (
                  <TableRow key={table.name}>
                    <TableCell className="font-medium">{table.name}</TableCell>
                    <TableCell>{table.rowCount.toLocaleString()}</TableCell>
                    <TableCell>{formatSize(table.sizeBytes)}</TableCell>
                    <TableCell>{table.schema.length}</TableCell>
                    <TableCell>{table.lastModified ? new Date(table.lastModified).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/sqlite/tables/${table.name}`}>
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/sqlite/tables/${table.name}/edit`}>
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedTable(table.name);
                              setTruncateDialogOpen(true);
                            }}
                          >
                            Clear Data
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSelectedTable(table.name);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Table
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 删除表确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the table "{selectedTable}"? This action cannot be undone
              and all data in this table will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 清空表确认对话框 */}
      <AlertDialog open={truncateDialogOpen} onOpenChange={setTruncateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Table Data</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all data from the table "{selectedTable}"? This will remove all rows
              but keep the table structure intact. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleTruncateTable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 