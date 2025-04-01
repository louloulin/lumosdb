import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileDown, RefreshCw, Search } from "lucide-react";
import Link from "next/link";

export default function SQLitePage() {
  // Sample data for demonstration
  const tables = [
    { 
      name: "users", 
      rows: 1243, 
      size: "1.2 MB",
      columns: 8,
      created: "2023-10-15"
    },
    { 
      name: "products", 
      rows: 567, 
      size: "780 KB",
      columns: 12,
      created: "2023-11-02"
    },
    { 
      name: "orders", 
      rows: 8921, 
      size: "5.4 MB",
      columns: 10,
      created: "2023-09-28"
    },
    { 
      name: "categories", 
      rows: 42, 
      size: "120 KB",
      columns: 5,
      created: "2023-08-15"
    },
    { 
      name: "order_items", 
      rows: 15342, 
      size: "8.7 MB",
      columns: 6,
      created: "2023-09-28"
    },
  ];

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
          <Button variant="outline">
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
              />
              <Button type="submit" size="icon" variant="ghost">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Columns</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.name}>
                  <TableCell className="font-medium">{table.name}</TableCell>
                  <TableCell>{table.rows.toLocaleString()}</TableCell>
                  <TableCell>{table.size}</TableCell>
                  <TableCell>{table.columns}</TableCell>
                  <TableCell>{table.created}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">View</Button>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 