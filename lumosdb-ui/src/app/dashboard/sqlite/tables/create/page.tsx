"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Save, Database } from "lucide-react";
import { toast } from "sonner";

// Data types available in SQLite
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

// Column interface
interface Column {
  id: string;
  name: string;
  type: string;
  primaryKey: boolean;
  notNull: boolean;
  unique: boolean;
  defaultValue: string;
}

export default function CreateTablePage() {
  const router = useRouter();
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<Column[]>([
    {
      id: "1",
      name: "id",
      type: "INTEGER",
      primaryKey: true,
      notNull: true,
      unique: false,
      defaultValue: "",
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  // Add a new column
  const addColumn = () => {
    const newId = (columns.length + 1).toString();
    setColumns([
      ...columns,
      {
        id: newId,
        name: "",
        type: "TEXT",
        primaryKey: false,
        notNull: false,
        unique: false,
        defaultValue: "",
      },
    ]);
  };

  // Remove a column
  const removeColumn = (id: string) => {
    setColumns(columns.filter((col) => col.id !== id));
  };

  // Update a column property
  const updateColumn = (id: string, field: keyof Column, value: any) => {
    setColumns(
      columns.map((col) =>
        col.id === id ? { ...col, [field]: value } : col
      )
    );
  };

  // Handle primary key selection
  const handlePrimaryKeyChange = (id: string, value: boolean) => {
    if (value) {
      // If setting as primary key, unset other primary keys
      setColumns(
        columns.map((col) =>
          col.id === id
            ? { ...col, primaryKey: true, notNull: true }
            : { ...col, primaryKey: false }
        )
      );
    } else {
      updateColumn(id, "primaryKey", false);
    }
  };

  // Validate the table structure
  const validateTable = (): boolean => {
    // Check table name
    if (!tableName.trim()) {
      setError("Table name is required");
      return false;
    }

    // Check column names
    const columnNames = columns.map((col) => col.name.trim());
    if (columnNames.some((name) => !name)) {
      setError("All columns must have names");
      return false;
    }

    // Check for duplicate column names
    const uniqueNames = new Set(columnNames);
    if (uniqueNames.size !== columnNames.length) {
      setError("Column names must be unique");
      return false;
    }

    // Make sure at least one column exists
    if (columns.length === 0) {
      setError("Table must have at least one column");
      return false;
    }

    return true;
  };

  // Create the table
  const createTable = async () => {
    if (!validateTable()) {
      return;
    }

    const sql = generateSQLPreview();
    console.log("Creating table with SQL:", sql);

    try {
      // 导入并使用createTable API
      const { createTable } = await import("@/lib/api/sql-service");
      const result = await createTable(sql);
      
      if (result.error) {
        setError(result.error);
        toast.error(`Failed to create table: ${result.error}`);
        return;
      }
      
      // Show success message
      toast.success("Table created successfully");
      
      // Navigate back to the tables list
      router.push("/dashboard/sqlite");
    } catch (error) {
      console.error("Error creating table:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      toast.error("Failed to create table");
    }
  };

  // Generate SQL preview
  const generateSQLPreview = (): string => {
    if (!tableName) return "";

    const columnDefs = columns
      .map((col) => {
        let def = `"${col.name}" ${col.type}`;
        if (col.primaryKey) def += " PRIMARY KEY";
        if (col.notNull) def += " NOT NULL";
        if (col.unique) def += " UNIQUE";
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
        return def;
      })
      .join(",\n  ");

    return `CREATE TABLE "${tableName}" (\n  ${columnDefs}\n);`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Create New Table</h2>
            <p className="text-muted-foreground">
              Define the structure of your new SQLite table
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={createTable}>
            <Save className="mr-2 h-4 w-4" />
            Create Table
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Table Information</CardTitle>
              <CardDescription>
                Basic information about your table
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="table-name">Table Name</Label>
                  <Input
                    id="table-name"
                    placeholder="Enter table name"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Columns</CardTitle>
                <CardDescription>
                  Define the columns for your table
                </CardDescription>
              </div>
              <Button size="sm" onClick={addColumn}>
                <Plus className="mr-2 h-4 w-4" />
                Add Column
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[100px] text-center">Primary Key</TableHead>
                      <TableHead className="w-[100px] text-center">Not Null</TableHead>
                      <TableHead className="w-[100px] text-center">Unique</TableHead>
                      <TableHead>Default Value</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map((column) => (
                      <TableRow key={column.id}>
                        <TableCell>
                          <Input
                            value={column.name}
                            onChange={(e) =>
                              updateColumn(column.id, "name", e.target.value)
                            }
                            placeholder="Column name"
                            className="min-w-[150px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={column.type}
                            onValueChange={(value) =>
                              updateColumn(column.id, "type", value)
                            }
                          >
                            <SelectTrigger className="w-[120px]">
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
                            checked={column.primaryKey}
                            onCheckedChange={(checked) =>
                              handlePrimaryKeyChange(column.id, checked === true)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={column.notNull}
                            onCheckedChange={(checked) =>
                              updateColumn(column.id, "notNull", checked === true)
                            }
                            disabled={column.primaryKey}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={column.unique}
                            onCheckedChange={(checked) =>
                              updateColumn(column.id, "unique", checked === true)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={column.defaultValue}
                            onChange={(e) =>
                              updateColumn(column.id, "defaultValue", e.target.value)
                            }
                            placeholder="Default value"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeColumn(column.id)}
                            disabled={columns.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>SQL Preview</CardTitle>
              <CardDescription>
                The SQL statement that will be executed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-auto text-xs font-mono whitespace-pre-wrap">
                {generateSQLPreview() || "-- Complete the form to see SQL preview"}
              </pre>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                <Database className="h-4 w-4 inline mr-1" />
                Target: SQLite
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
} 