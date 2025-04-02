"use client"

import Link from "next/link"
import { DocWrapper } from "@/components/doc-wrapper"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Database, 
  ChevronLeft, 
  Code, 
  Lock,
  Plus,
  Search,
  AlertTriangle,
  FileType,
  Table2,
  ListFilter
} from "lucide-react"

export default function SQLiteIntegrationPage() {
  return (
    <DocWrapper>
      <div className="flex items-center mb-6">
        <Link href="/dashboard/docs">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to Documentation
          </Button>
        </Link>
        <div className="ml-auto flex gap-2">
          <Badge variant="outline">SQLite</Badge>
          <Badge variant="outline">Management</Badge>
          <Badge variant="outline">Optimization</Badge>
        </div>
      </div>

      <div className="space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Database className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">SQLite Database Management</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            How to create, manage, and optimize SQLite databases in LumosDB
          </p>
          <Separator className="my-6" />
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Introduction to SQLite</h2>
          <p>
            SQLite is a lightweight, file-based relational database that provides a robust and reliable 
            storage solution without requiring a separate server process. It's ideal for embedded applications, 
            prototyping, testing, and smaller applications.
          </p>
          <p>
            LumosDB simplifies SQLite database management by providing a user-friendly interface for 
            creating, querying, modifying, and optimizing your SQLite databases.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Creating SQLite Databases</h2>
          <p>
            To create a new SQLite database in LumosDB:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to the SQLite section</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click on "SQLite" in the main navigation sidebar.
              </p>
            </li>
            <li>
              <span className="font-medium">Create a new database</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click the "New Database" button and provide a name for your database.
              </p>
            </li>
            <li>
              <span className="font-medium">Configure database settings</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Set optional parameters like encoding, page size, and journal mode.
              </p>
            </li>
          </ol>
          
          <Alert className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              SQLite database files (.db, .sqlite, .sqlite3) are stored in the LumosDB data directory 
              by default. You can configure a custom location in the settings.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Managing Tables</h2>
          
          <h3 className="text-xl font-semibold mt-6">Creating Tables</h3>
          <p>
            You can create tables using the visual table designer or with SQL:
          </p>
          
          <Card className="mt-4">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2">Visual Table Designer</h4>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Click "New Table" in the database view</li>
                <li>Enter a table name</li>
                <li>Add columns with their data types and constraints</li>
                <li>Set primary key, unique, and index constraints</li>
                <li>Click "Create Table" to save</li>
              </ol>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2">Using SQL</h4>
              <p className="mb-2">Open the SQL Editor and execute a CREATE TABLE statement:</p>
              <div className="bg-muted p-4 rounded-md overflow-x-auto">
                <pre className="text-sm">
                  <code>
                    CREATE TABLE products (
                    {"\n"}  id INTEGER PRIMARY KEY AUTOINCREMENT,
                    {"\n"}  name TEXT NOT NULL,
                    {"\n"}  price REAL NOT NULL DEFAULT 0,
                    {"\n"}  description TEXT,
                    {"\n"}  category_id INTEGER,
                    {"\n"}  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    {"\n"}  FOREIGN KEY (category_id) REFERENCES categories(id)
                    {"\n"});
                  </code>
                </pre>
              </div>
            </CardContent>
          </Card>
          
          <h3 className="text-xl font-semibold mt-6">Modifying Tables</h3>
          <p>
            To modify an existing table:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <span className="font-medium">Add columns</span>: Use ALTER TABLE ADD COLUMN
            </li>
            <li>
              <span className="font-medium">Rename tables</span>: Use ALTER TABLE RENAME TO
            </li>
            <li>
              <span className="font-medium">Drop tables</span>: Use DROP TABLE
            </li>
          </ul>
          
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Add a column
                {"\n"}ALTER TABLE products ADD COLUMN in_stock BOOLEAN DEFAULT 1;
                {"\n"}
                {"\n"}-- Rename a table
                {"\n"}ALTER TABLE products RENAME TO inventory;
                {"\n"}
                {"\n"}-- Drop a table
                {"\n"}DROP TABLE IF EXISTS old_products;
              </code>
            </pre>
          </div>
          
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              SQLite has limitations on ALTER TABLE operations. You cannot remove columns or change 
              their data type directly. LumosDB provides a "Rebuild Table" feature that handles these
              operations by creating a new table with the desired structure and copying the data.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Working with Data</h2>
          
          <h3 className="text-xl font-semibold mt-6">Inserting Data</h3>
          <p>
            You can insert data using the table view or SQL:
          </p>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Insert a single row
                {"\n"}INSERT INTO categories (name) VALUES ('Electronics');
                {"\n"}
                {"\n"}-- Insert multiple rows
                {"\n"}INSERT INTO products (name, price, category_id) VALUES 
                {"\n"}  ('Smartphone', 699.99, 1),
                {"\n"}  ('Laptop', 1299.99, 1),
                {"\n"}  ('Headphones', 149.99, 1);
              </code>
            </pre>
          </div>
          
          <h3 className="text-xl font-semibold mt-6">Querying Data</h3>
          <p>
            The SQL Editor provides full support for querying data:
          </p>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Basic query
                {"\n"}SELECT * FROM products WHERE price &gt; 500;
                {"\n"}
                {"\n"}-- Join query
                {"\n"}SELECT p.name, p.price, c.name as category
                {"\n"}FROM products p
                {"\n"}JOIN categories c ON p.category_id = c.id
                {"\n"}ORDER BY p.price DESC;
                {"\n"}
                {"\n"}-- Aggregate query
                {"\n"}SELECT c.name, COUNT(*) as product_count, AVG(p.price) as avg_price
                {"\n"}FROM products p
                {"\n"}JOIN categories c ON p.category_id = c.id
                {"\n"}GROUP BY c.name;
              </code>
            </pre>
          </div>
          
          <h3 className="text-xl font-semibold mt-6">Updating and Deleting Data</h3>
          <p>
            Manage your data with UPDATE and DELETE statements:
          </p>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Update data
                {"\n"}UPDATE products SET price = price * 0.9 WHERE category_id = 1;
                {"\n"}
                {"\n"}-- Delete data
                {"\n"}DELETE FROM products WHERE id = 2;
              </code>
            </pre>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">SQLite Optimization</h2>
          
          <h3 className="text-xl font-semibold mt-6">Indexing</h3>
          <p>
            Indexes can significantly improve query performance. LumosDB provides a visual interface for 
            creating and managing indexes, or you can use SQL:
          </p>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Create an index
                {"\n"}CREATE INDEX idx_products_category ON products(category_id);
                {"\n"}
                {"\n"}-- Create a unique index
                {"\n"}CREATE UNIQUE INDEX idx_products_sku ON products(sku);
                {"\n"}
                {"\n"}-- Drop an index
                {"\n"}DROP INDEX idx_products_category;
              </code>
            </pre>
          </div>
          
          <h3 className="text-xl font-semibold mt-6">Database Maintenance</h3>
          <p>
            LumosDB provides several tools for maintaining your SQLite databases:
          </p>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Code className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold">VACUUM</h4>
                    <p className="text-sm text-muted-foreground">
                      Rebuilds the database file to reclaim unused space
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold">PRAGMA integrity_check</h4>
                    <p className="text-sm text-muted-foreground">
                      Verifies the integrity of the database
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Search className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold">ANALYZE</h4>
                    <p className="text-sm text-muted-foreground">
                      Collects statistics to optimize query execution
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold">REINDEX</h4>
                    <p className="text-sm text-muted-foreground">
                      Rebuilds indexes for improved performance
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">SQLite Data Types</h2>
          <p>
            SQLite uses a dynamic type system with the following storage classes:
          </p>
          
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Example</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">INTEGER</TableCell>
                <TableCell>Signed integers</TableCell>
                <TableCell><code>id INTEGER PRIMARY KEY</code></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">REAL</TableCell>
                <TableCell>Floating point values</TableCell>
                <TableCell><code>price REAL</code></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">TEXT</TableCell>
                <TableCell>Text strings</TableCell>
                <TableCell><code>name TEXT</code></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">BLOB</TableCell>
                <TableCell>Binary data</TableCell>
                <TableCell><code>image BLOB</code></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">NULL</TableCell>
                <TableCell>Null value</TableCell>
                <TableCell><code>NULL</code></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <p className="mt-4">
            While SQLite supports other type names (e.g., VARCHAR, DATETIME), these are converted to one 
            of the five storage classes above. LumosDB provides convenient type mapping for common data types.
          </p>
        </section>

        <Separator className="my-6" />

        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/docs/getting-started">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: Getting Started
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/docs/duckdb-guide">
              Next: Working with DuckDB
              <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
            </Link>
          </Button>
        </div>
      </div>
    </DocWrapper>
  )
} 