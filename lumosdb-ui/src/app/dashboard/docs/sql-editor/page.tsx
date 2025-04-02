"use client"

import Link from "next/link"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Code, 
  ChevronLeft, 
  Terminal,
  Save,
  History,
  FileDown,
  Lightbulb,
  LayoutGrid,
  Table2,
  KeyRound,
  Keyboard
} from "lucide-react"

export default function SQLEditorPage() {
  return (
    <ResponsiveContainer className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/docs">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to Documentation
          </Button>
        </Link>
        <div className="ml-auto flex gap-2">
          <Badge variant="outline">SQL</Badge>
          <Badge variant="outline">Editor</Badge>
          <Badge variant="outline">Query</Badge>
        </div>
      </div>

      <div className="space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Code className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">SQL Editor Tutorial</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            How to use the SQL Editor to query and manage your databases in LumosDB
          </p>
          <Separator className="my-6" />
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Introduction to the SQL Editor</h2>
          <p>
            The SQL Editor in LumosDB provides a powerful interface for writing, executing, and 
            managing SQL queries for your databases. It supports both SQLite and DuckDB dialects, 
            with features like syntax highlighting, auto-completion, and result visualization.
          </p>
          <p>
            Key features of the SQL Editor include:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Syntax highlighting with error detection</li>
            <li>Auto-completion for tables, columns, and SQL keywords</li>
            <li>Query history and saved queries</li>
            <li>Multiple result formats (table, JSON, chart)</li>
            <li>Export functionality for query results</li>
            <li>Keyboard shortcuts for improved productivity</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Getting Started</h2>
          
          <h3 className="text-xl font-semibold mt-6">Accessing the SQL Editor</h3>
          <p>
            To access the SQL Editor:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to your database</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Select either SQLite or DuckDB from the sidebar, then choose your database.
              </p>
            </li>
            <li>
              <span className="font-medium">Click on "SQL Editor" tab</span>
              <p className="text-muted-foreground ml-6 mt-1">
                This will open the SQL Editor interface for the selected database.
              </p>
            </li>
            <li>
              <span className="font-medium">Alternatively, use the global SQL Editor</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click "SQL Editor" in the main sidebar to open a global editor where you can select any database.
              </p>
            </li>
          </ol>
          
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <LayoutGrid className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold">SQL Editor Layout</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    The SQL Editor consists of the following sections:
                  </p>
                  <ul className="list-disc list-inside text-sm mt-2">
                    <li>Query editor panel (top) - where you write your SQL</li>
                    <li>Results panel (bottom) - displays query results</li>
                    <li>Database explorer (left sidebar) - shows tables and columns</li>
                    <li>Controls bar - with run, save, and export buttons</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Writing SQL Queries</h2>
          
          <h3 className="text-xl font-semibold mt-6">Basic Queries</h3>
          <p>
            The editor supports all standard SQL queries. Here are some examples:
          </p>
          
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Select all columns from a table
                {"\n"}SELECT * FROM users;
                {"\n"}
                {"\n"}-- Select specific columns with a condition
                {"\n"}SELECT id, name, email 
                {"\n"}FROM users 
                {"\n"}WHERE status = 'active';
                {"\n"}
                {"\n"}-- Join tables
                {"\n"}SELECT users.name, orders.order_date, orders.amount
                {"\n"}FROM users
                {"\n"}JOIN orders ON users.id = orders.user_id
                {"\n"}WHERE orders.status = 'completed';
              </code>
            </pre>
          </div>
          
          <h3 className="text-xl font-semibold mt-6">Advanced Queries</h3>
          
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Aggregate functions
                {"\n"}SELECT 
                {"\n"}  category,
                {"\n"}  COUNT(*) as total_products,
                {"\n"}  AVG(price) as average_price,
                {"\n"}  MAX(price) as highest_price
                {"\n"}FROM products
                {"\n"}GROUP BY category
                {"\n"}HAVING COUNT(*) > 5
                {"\n"}ORDER BY average_price DESC;
                {"\n"}
                {"\n"}-- Subqueries
                {"\n"}SELECT name, email
                {"\n"}FROM users
                {"\n"}WHERE id IN (
                {"\n"}  SELECT DISTINCT user_id
                {"\n"}  FROM orders
                {"\n"}  WHERE order_date >= date('now', '-30 days')
                {"\n"});
              </code>
            </pre>
          </div>
          
          <Alert className="mt-6">
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Pro Tip</AlertTitle>
            <AlertDescription>
              Use the database explorer on the left to view table structures and column names.
              You can double-click on table or column names to insert them into your query.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Executing Queries</h2>
          
          <p>
            To execute a query:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>
              <span className="font-medium">Write your SQL query in the editor</span>
            </li>
            <li>
              <span className="font-medium">Click the "Run" button or press Ctrl+Enter (Cmd+Enter on Mac)</span>
            </li>
            <li>
              <span className="font-medium">View the results in the results panel below</span>
            </li>
          </ol>
          
          <h3 className="text-xl font-semibold mt-6">Multiple Queries</h3>
          <p>
            You can execute multiple queries in a single run:
          </p>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- First query
                {"\n"}SELECT COUNT(*) as total_users FROM users;
                {"\n"}
                {"\n"}-- Second query
                {"\n"}SELECT COUNT(*) as active_users FROM users WHERE status = 'active';
              </code>
            </pre>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            When executing multiple queries, results will be displayed as separate tabs in the results panel.
          </p>
          
          <h3 className="text-xl font-semibold mt-6">Transaction Support</h3>
          <p>
            You can use transactions to group multiple operations:
          </p>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Start a transaction
                {"\n"}BEGIN TRANSACTION;
                {"\n"}
                {"\n"}-- Insert a new user
                {"\n"}INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com');
                {"\n"}
                {"\n"}-- Get the new user's ID
                {"\n"}SELECT last_insert_rowid() as user_id;
                {"\n"}
                {"\n"}-- Insert related data
                {"\n"}INSERT INTO user_settings (user_id, theme) VALUES (last_insert_rowid(), 'dark');
                {"\n"}
                {"\n"}-- Commit the transaction
                {"\n"}COMMIT;
              </code>
            </pre>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Working with Results</h2>
          
          <h3 className="text-xl font-semibold mt-6">Results Display Options</h3>
          <p>
            LumosDB SQL Editor provides multiple ways to view your query results:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Table2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Table View</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      The default view displays results in a tabular format with column headers.
                      You can sort columns by clicking on the header, and resize columns by dragging.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Code className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold">JSON View</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Switch to JSON view to see results as JSON objects. This is useful for 
                      inspecting complex data structures or copying data for API testing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Raw Output</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      For non-query commands like CREATE TABLE or INSERT, raw output shows 
                      success messages or affected row counts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <FileDown className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Export Options</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Export results to CSV, JSON, or Excel formats for further analysis or sharing.
                      Use the export button in the results toolbar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Managing Queries</h2>
          
          <h3 className="text-xl font-semibold mt-6">Saving Queries</h3>
          <p>
            To save a query for future use:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Write your query in the editor</li>
            <li>Click the "Save" button <Save className="inline h-4 w-4" /></li>
            <li>Enter a name for your query</li>
            <li>Optionally add a description and tags</li>
            <li>Click "Save"</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-2">
            Saved queries can be accessed from the "Saved" tab in the sidebar. You can organize them by folders 
            and mark frequently used queries as favorites.
          </p>
          
          <h3 className="text-xl font-semibold mt-6">Query History</h3>
          <p>
            LumosDB automatically keeps a history of your executed queries:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Click the "History" button <History className="inline h-4 w-4" /> to view recent queries</li>
            <li>Select any query from the history to load it into the editor</li>
            <li>You can save queries from the history to your saved queries</li>
            <li>History includes execution time and result statistics</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
          <p>
            The SQL Editor supports many keyboard shortcuts for efficient usage:
          </p>
          
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Windows/Linux</TableHead>
                <TableHead>macOS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Execute Query</TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd></TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Save Query</TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">S</kbd></TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">S</kbd></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Format SQL</TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">Shift</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">F</kbd></TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">Shift</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">F</kbd></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Comment Line</TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">/</kbd></TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">/</kbd></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Find</TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">F</kbd></TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">F</kbd></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Replace</TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">H</kbd></TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">H</kbd></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Undo</TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">Z</kbd></TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">Z</kbd></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Redo</TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">Y</kbd></TableCell>
                <TableCell><kbd className="px-1 py-0.5 bg-muted rounded">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">Shift</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">Z</kbd></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <Alert className="mt-6">
            <Keyboard className="h-4 w-4" />
            <AlertTitle>Keyboard Shortcut Reference</AlertTitle>
            <AlertDescription>
              You can view all available keyboard shortcuts by pressing <kbd className="px-1 py-0.5 bg-muted rounded">F1</kbd> or 
              clicking the keyboard icon in the editor toolbar.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Advanced Features</h2>
          
          <h3 className="text-xl font-semibold mt-6">Auto-completion</h3>
          <p>
            The SQL Editor provides intelligent auto-completion:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Table names after <code>FROM</code>, <code>JOIN</code>, etc.</li>
            <li>Column names based on the tables in your query</li>
            <li>SQL keywords and functions</li>
            <li>Alias suggestions</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            Trigger auto-completion by typing or pressing <kbd className="px-1 py-0.5 bg-muted rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">Space</kbd> 
            (<kbd className="px-1 py-0.5 bg-muted rounded">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded">Space</kbd> on Mac).
          </p>
          
          <h3 className="text-xl font-semibold mt-6">Query Parameterization</h3>
          <p>
            You can use parameters in your queries for reusability:
          </p>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Using named parameters
                {"\n"}SELECT * FROM users WHERE status = :status AND created_at > :since_date;
                {"\n"}
                {"\n"}-- Using question mark placeholders (positional parameters)
                {"\n"}SELECT * FROM products WHERE category = ? AND price > ?;
              </code>
            </pre>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            When a query with parameters is executed, you'll be prompted to provide values for each parameter.
          </p>
          
          <h3 className="text-xl font-semibold mt-6">Query Timing and Explain Plans</h3>
          <p>
            Analyze query performance:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Query execution time is displayed in the results footer</li>
            <li>Use <code>EXPLAIN QUERY PLAN</code> to see how SQLite will execute a query</li>
            <li>Use the "Analyze" button to get detailed performance metrics</li>
          </ul>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- View the execution plan
                {"\n"}EXPLAIN QUERY PLAN
                {"\n"}SELECT users.name, COUNT(orders.id) as order_count
                {"\n"}FROM users
                {"\n"}LEFT JOIN orders ON users.id = orders.user_id
                {"\n"}GROUP BY users.id
                {"\n"}HAVING order_count > 5;
              </code>
            </pre>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Best Practices</h2>
          
          <ul className="list-disc list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Test complex queries on small data subsets first</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Add LIMIT clauses when testing to avoid performance issues with large results.
              </p>
            </li>
            <li>
              <span className="font-medium">Use transactions for multiple related operations</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Wrap related changes in BEGIN/COMMIT to ensure atomicity.
              </p>
            </li>
            <li>
              <span className="font-medium">Save frequently used queries</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Create a library of saved queries to improve productivity.
              </p>
            </li>
            <li>
              <span className="font-medium">Add comments to complex queries</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Document your SQL with comments for future reference.
              </p>
            </li>
            <li>
              <span className="font-medium">Use the database explorer to understand your schema</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Explore tables, indexes, and column types before writing queries.
              </p>
            </li>
          </ul>
          
          <Alert className="mt-6">
            <KeyRound className="h-4 w-4" />
            <AlertTitle>Security Note</AlertTitle>
            <AlertDescription>
              Be careful with UPDATE and DELETE statements without WHERE clauses as they affect all rows.
              LumosDB will warn you when executing such potentially destructive queries.
            </AlertDescription>
          </Alert>
        </section>

        <Separator className="my-6" />

        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/docs/vector-search">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: Vector Search Implementation
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/docs/backup-recovery">
              Next: Backup & Recovery Guide
              <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
            </Link>
          </Button>
        </div>
      </div>
    </ResponsiveContainer>
  )
} 