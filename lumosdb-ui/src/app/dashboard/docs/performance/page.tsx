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
  Gauge, 
  ChevronLeft, 
  Zap,
  Database,
  BarChart,
  Timer,
  Search,
  HardDrive,
  Cpu,
  Settings,
  ArrowDownUp,
  Lightbulb
} from "lucide-react"

export default function PerformancePage() {
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
          <Badge variant="outline">Performance</Badge>
          <Badge variant="outline">Optimization</Badge>
          <Badge variant="outline">Tuning</Badge>
        </div>
      </div>

      <div className="space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Gauge className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">Performance Optimization</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Techniques to maximize performance and optimize your databases in LumosDB
          </p>
          <Separator className="my-6" />
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Introduction to Database Performance</h2>
          <p>
            Database performance optimization is the process of making your database operate more efficiently.
            This includes faster query execution, reduced resource consumption, and improved responsiveness.
            LumosDB provides various tools and techniques to help you identify and resolve performance bottlenecks.
          </p>
          <p>
            Key areas of database performance include:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Query optimization</li>
            <li>Index management</li>
            <li>Schema design</li>
            <li>Memory utilization</li>
            <li>Disk I/O performance</li>
            <li>Connection management</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Performance Monitoring</h2>
          
          <p>
            Before optimizing, you need to understand your current performance baseline and identify bottlenecks.
            LumosDB provides comprehensive monitoring tools to help you analyze database performance:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <BarChart className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Performance Dashboard</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      The main monitoring interface in LumosDB that provides real-time metrics and historical
                      performance data. Access it from the "Monitoring" section in the sidebar.
                    </p>
                    <ul className="list-disc list-inside text-sm mt-2">
                      <li>CPU and memory usage</li>
                      <li>Disk I/O statistics</li>
                      <li>Query response times</li>
                      <li>Connection counts</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Timer className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Query Profiler</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Analyzes individual query performance with detailed execution statistics. 
                      Enable query profiling in the SQL Editor to collect this data automatically.
                    </p>
                    <ul className="list-disc list-inside text-sm mt-2">
                      <li>Execution time breakdown</li>
                      <li>Rows examined vs. returned</li>
                      <li>Index usage information</li>
                      <li>Memory consumption</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Alert className="mt-6">
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Monitoring Tip</AlertTitle>
            <AlertDescription>
              Set up custom performance alerts to be notified when certain metrics exceed thresholds.
              This helps you address issues before they impact your users. Configure alerts in the
              Monitoring section under &quot;Alerts &amp; Notifications&quot;.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Query Optimization</h2>
          
          <p>
            Inefficient queries are often the primary cause of performance issues. Here are techniques to optimize your queries:
          </p>
          
          <h3 className="text-xl font-semibold mt-6">Understanding Execution Plans</h3>
          <p>
            Execution plans show how the database engine processes your query. In LumosDB, you can view execution plans for both SQLite and DuckDB:
          </p>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- SQLite execution plan
                {"\n"}EXPLAIN QUERY PLAN
                {"\n"}SELECT users.name, orders.order_date
                {"\n"}FROM users JOIN orders ON users.id = orders.user_id
                {"\n"}WHERE orders.status = 'completed';
                {"\n"}
                {"\n"}-- DuckDB execution plan (more detailed)
                {"\n"}EXPLAIN ANALYZE
                {"\n"}SELECT category, AVG(price) as avg_price
                {"\n"}FROM products
                {"\n"}GROUP BY category
                {"\n"}ORDER BY avg_price DESC;
              </code>
            </pre>
          </div>
          
          <h3 className="text-xl font-semibold mt-6">Common Query Optimizations</h3>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Issue</TableHead>
                <TableHead>Optimization</TableHead>
                <TableHead>Example</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Full table scans</TableCell>
                <TableCell>Add appropriate indexes</TableCell>
                <TableCell><code>CREATE INDEX idx_users_email ON users(email);</code></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Selecting too many columns</TableCell>
                <TableCell>Specify needed columns instead of using SELECT *</TableCell>
                <TableCell><code>SELECT id, name, email FROM users;</code></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Inefficient JOINs</TableCell>
                <TableCell>Index JOIN columns and optimize JOIN order</TableCell>
                <TableCell><code>CREATE INDEX idx_orders_user_id ON orders(user_id);</code></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Sorting large results</TableCell>
                <TableCell>Create indexed views or use LIMIT with ORDER BY</TableCell>
                <TableCell><code>SELECT * FROM products ORDER BY price DESC LIMIT 100;</code></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">WHERE clauses</TableCell>
                <TableCell>Make conditions indexable</TableCell>
                <TableCell>
                  <code>WHERE created_at &gt; &apos;2023-01-01&apos;</code> instead of <code>WHERE YEAR(created_at) &gt; 2022</code>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <Alert className="mt-6">
            <Zap className="h-4 w-4" />
            <AlertTitle>Query Analyzer</AlertTitle>
            <AlertDescription>
              LumosDB includes a Query Analyzer tool that automatically suggests improvements for your queries.
              Access it by clicking the &quot;Analyze&quot; button in the SQL Editor after running a query.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Index Optimization</h2>
          
          <p>
            Indexes greatly impact database performance by allowing the database engine to find data without scanning entire tables.
          </p>
          
          <h3 className="text-xl font-semibold mt-6">Index Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">SQLite Indexes</h3>
                    <ul className="list-disc list-inside text-sm mt-2">
                      <li>Single-column indexes</li>
                      <li>Composite indexes (multiple columns)</li>
                      <li>Unique indexes</li>
                      <li>Expression indexes</li>
                      <li>Partial indexes (with WHERE clause)</li>
                    </ul>
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
                    <h3 className="font-semibold">Vector Indexes</h3>
                    <ul className="list-disc list-inside text-sm mt-2">
                      <li>HNSW (Hierarchical Navigable Small World)</li>
                      <li>IVF (Inverted File Index)</li>
                      <li>Flat index (exhaustive search)</li>
                      <li>Metadata filters</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <h3 className="text-xl font-semibold mt-6">Index Management</h3>
          <p>
            Follow these best practices for index management:
          </p>
          <ul className="list-disc list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Create indexes on frequently queried columns</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Analyze your query patterns and add indexes to columns used in WHERE, JOIN, or ORDER BY clauses.
              </p>
            </li>
            <li>
              <span className="font-medium">Avoid over-indexing</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Too many indexes can slow down write operations and increase storage requirements.
                LumosDB&apos;s Index Analyzer can suggest redundant indexes to remove.
              </p>
            </li>
            <li>
              <span className="font-medium">Order matters in composite indexes</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Put highly selective columns first in composite indexes. For example, in an index on
                (status, created_at), put status first if it has fewer distinct values.
              </p>
            </li>
            <li>
              <span className="font-medium">Maintain indexes regularly</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Use REINDEX command periodically to rebuild fragmented indexes, especially after
                bulk operations or many updates.
              </p>
            </li>
          </ul>
          
          <div className="bg-muted p-4 rounded-md mt-6 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Create a basic index
                {"\n"}CREATE INDEX idx_customers_last_name ON customers(last_name);
                {"\n"}
                {"\n"}-- Create a composite index
                {"\n"}CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date DESC);
                {"\n"}
                {"\n"}-- Create a unique index
                {"\n"}CREATE UNIQUE INDEX idx_users_email ON users(email);
                {"\n"}
                {"\n"}-- Create a partial index
                {"\n"}CREATE INDEX idx_orders_status ON orders(status) WHERE status IN ('pending', 'processing');
                {"\n"}
                {"\n"}-- Rebuild an index
                {"\n"}REINDEX idx_customers_last_name;
              </code>
            </pre>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">System Resource Optimization</h2>
          
          <p>
            Database performance is also affected by system resources. LumosDB allows you to configure and optimize these resources:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Memory Settings</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Optimize memory usage to balance performance and resource consumption.
                    </p>
                    <ul className="list-disc list-inside text-sm mt-2">
                      <li>Cache size settings</li>
                      <li>Memory-mapped I/O</li>
                      <li>Query memory limits</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Storage Optimization</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Optimize how data is stored and accessed on disk.
                    </p>
                    <ul className="list-disc list-inside text-sm mt-2">
                      <li>Journal mode configuration</li>
                      <li>Page size settings</li>
                      <li>Write-ahead logging</li>
                      <li>Compression options</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <ArrowDownUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Connection Management</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Optimize how database connections are handled.
                    </p>
                    <ul className="list-disc list-inside text-sm mt-2">
                      <li>Connection pooling</li>
                      <li>Maximum connections</li>
                      <li>Timeout settings</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">PRAGMA Settings</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fine-tune SQLite database behavior.
                    </p>
                    <ul className="list-disc list-inside text-sm mt-2">
                      <li>synchronous mode</li>
                      <li>temp_store</li>
                      <li>mmap_size</li>
                      <li>cache_size</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-muted p-4 rounded-md mt-6 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- SQLite performance settings
                {"\n"}PRAGMA journal_mode = WAL;          -- Use Write-Ahead Logging
                {"\n"}PRAGMA synchronous = NORMAL;        -- Faster but still safe synchronization
                {"\n"}PRAGMA cache_size = -20000;         -- Use 20MB of RAM for page cache
                {"\n"}PRAGMA temp_store = MEMORY;         -- Store temp tables in memory
                {"\n"}PRAGMA mmap_size = 30000000000;     -- Memory-map up to 30GB of database file
                {"\n"}
                {"\n"}-- Apply settings automatically on connection
                {"\n"}-- You can configure these in LumosDB Settings &gt; Database Configuration
              </code>
            </pre>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Database Maintenance</h2>
          
          <p>
            Regular maintenance is essential for keeping your database performing optimally:
          </p>
          
          <ul className="list-disc list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Vacuum databases regularly</span>
              <p className="text-muted-foreground ml-6 mt-1">
                The VACUUM command rebuilds the database file, reclaiming unused space and potentially
                improving performance. Schedule automatic VACUUMs in Database Settings.
              </p>
              <div className="bg-muted p-2 rounded-md ml-6 mt-1 overflow-x-auto">
                <pre className="text-sm">
                  <code>VACUUM;</code>
                </pre>
              </div>
            </li>
            <li>
              <span className="font-medium">Analyze tables for statistics</span>
              <p className="text-muted-foreground ml-6 mt-1">
                The ANALYZE command updates statistics used by the query optimizer to make better
                execution plans. Run it after significant data changes.
              </p>
              <div className="bg-muted p-2 rounded-md ml-6 mt-1 overflow-x-auto">
                <pre className="text-sm">
                  <code>ANALYZE;</code>
                </pre>
              </div>
            </li>
            <li>
              <span className="font-medium">Check for integrity issues</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Use the integrity_check pragma to verify database consistency. LumosDB can 
                schedule automatic integrity checks from the Maintenance section.
              </p>
              <div className="bg-muted p-2 rounded-md ml-6 mt-1 overflow-x-auto">
                <pre className="text-sm">
                  <code>PRAGMA integrity_check;</code>
                </pre>
              </div>
            </li>
            <li>
              <span className="font-medium">Archive old data</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Consider archiving or purging historical data that isn&apos;t frequently accessed.
                LumosDB&apos;s Data Archiving feature can help automate this process.
              </p>
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Performance for Vector Databases</h2>
          
          <p>
            Vector databases have unique performance considerations:
          </p>
          
          <ul className="list-disc list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Choose the right index type</span>
              <p className="text-muted-foreground ml-6 mt-1">
                HNSW indexes provide the best balance of search speed and accuracy for most use cases.
                Flat indexes are more accurate but slower. Configure index type when creating a collection.
              </p>
            </li>
            <li>
              <span className="font-medium">Optimize vector dimensions</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Higher dimensionality (e.g., 1536 for OpenAI embeddings) provides more precision but
                uses more memory and affects performance. Use dimensionality reduction techniques when
                appropriate.
              </p>
            </li>
            <li>
              <span className="font-medium">Use metadata filtering</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Adding metadata filters to vector searches can significantly reduce the search space
                and improve performance. Create metadata indexes for frequently filtered fields.
              </p>
            </li>
            <li>
              <span className="font-medium">Balance k value in queries</span>
              <p className="text-muted-foreground ml-6 mt-1">
                The k value (number of results) affects search performance. Request only as many
                results as needed for your use case.
              </p>
            </li>
          </ul>
          
          <Alert className="mt-6">
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Vector Performance Tip</AlertTitle>
            <AlertDescription>
              For vector collections with millions of vectors, enable vector quantization to reduce memory usage
              and improve search performance. This can be configured in the advanced settings when creating a collection.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Performance Checklist</h2>
          
          <p>
            Use this checklist to systematically optimize your LumosDB performance:
          </p>
          
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead>Action Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Monitoring</TableCell>
                <TableCell>
                  <ul className="list-disc list-inside">
                    <li>Set up performance monitoring dashboard</li>
                    <li>Configure alerts for critical metrics</li>
                    <li>Establish performance baselines</li>
                  </ul>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Queries</TableCell>
                <TableCell>
                  <ul className="list-disc list-inside">
                    <li>Review and optimize slow queries</li>
                    <li>Use EXPLAIN QUERY PLAN to analyze execution</li>
                    <li>Remove unnecessary SELECT columns</li>
                  </ul>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Indexes</TableCell>
                <TableCell>
                  <ul className="list-disc list-inside">
                    <li>Create indexes for frequent query patterns</li>
                    <li>Review and remove unnecessary indexes</li>
                    <li>Rebuild fragmented indexes</li>
                  </ul>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Schema</TableCell>
                <TableCell>
                  <ul className="list-disc list-inside">
                    <li>Normalize/denormalize appropriately</li>
                    <li>Use appropriate data types</li>
                    <li>Add constraints to improve optimizer choices</li>
                  </ul>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">System</TableCell>
                <TableCell>
                  <ul className="list-disc list-inside">
                    <li>Configure memory settings</li>
                    <li>Set appropriate PRAGMA values</li>
                    <li>Schedule maintenance tasks</li>
                  </ul>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        <Separator className="my-6" />

        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/docs/backup-recovery">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: Backup & Recovery Guide
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/docs">
              <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
              Back to Documentation
            </Link>
          </Button>
        </div>
      </div>
    </DocWrapper>
  )
} 