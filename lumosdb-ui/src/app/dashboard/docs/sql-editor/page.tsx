"use client"

import Link from "next/link"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  ChevronLeft, 
  Pencil,
  Code,
  Save,
  Play,
  Settings,
  Table2,
  History,
  Bookmark,
  Download,
  ChevronRight,
  Info,
  Lightbulb,
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
            Learn how to use the LumosDB SQL Editor for database querying and management
          </p>
          <Separator className="my-6" />
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Introduction to SQL Editor</h2>
          <p>
            The LumosDB SQL Editor is a powerful tool for interacting with your databases using SQL 
            queries. It provides a seamless interface for writing, executing, and managing SQL 
            statements across different database types.
          </p>
          <p>
            Key features of the SQL Editor include:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Syntax highlighting and code completion</li>
            <li>Multiple database connection support</li>
            <li>Query history and saved queries</li>
            <li>Visual query results with export options</li>
            <li>Schema browser integration</li>
            <li>Performance optimization suggestions</li>
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
              <span className="font-medium">Navigate to the SQL section</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click on &quot;SQL Editor&quot; in the main navigation sidebar.
              </p>
            </li>
            <li>
              <span className="font-medium">Select a database connection</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Choose from your existing database connections or create a new one.
              </p>
            </li>
            <li>
              <span className="font-medium">Start writing queries</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Use the editor area to write your SQL statements.
              </p>
            </li>
          </ol>
          
          <div className="mt-6 rounded-md overflow-hidden border bg-muted">
            <div className="bg-muted p-2 border-b">
              <div className="flex items-center">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 mr-2">
                  <Info className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold">SQL Editor Interface</span>
              </div>
            </div>
            <div className="bg-card p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between p-2 border-b">
                  <div className="flex gap-2">
                    <div className="w-24 h-6 bg-muted rounded-md"></div>
                    <div className="w-24 h-6 bg-primary/20 rounded-md"></div>
                    <div className="w-24 h-6 bg-muted rounded-md"></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" disabled className="h-6">
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" disabled className="h-6">
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" disabled className="h-6">
                      <Bookmark className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex h-48">
                  <div className="w-1/5 border-r p-2">
                    <div className="text-xs font-semibold mb-2">Databases</div>
                    <div className="space-y-1">
                      <div className="flex items-center text-xs p-1 rounded-sm bg-primary/10">
                        <div className="w-3 h-3 mr-1 bg-primary/30 rounded-sm"></div>
                        <span>example_db</span>
                      </div>
                      <div className="flex items-center text-xs p-1">
                        <div className="w-3 h-3 mr-1 bg-muted rounded-sm"></div>
                        <span>analytics</span>
                      </div>
                      <div className="flex items-center text-xs p-1">
                        <div className="w-3 h-3 mr-1 bg-muted rounded-sm"></div>
                        <span>users</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-4/5 flex flex-col">
                    <div className="h-24 p-2 border-b text-xs font-mono bg-background">
                      <div className="font-semibold text-muted-foreground mb-1">-- SQL Query Editor</div>
                      <div>SELECT * </div>
                      <div>FROM users</div>
                      <div>WHERE created_at &gt; &#39;2023-01-01&#39;</div>
                      <div>LIMIT 10;</div>
                    </div>
                    <div className="flex-1 p-2">
                      <div className="flex justify-between mb-2">
                        <div className="text-xs font-semibold">Results</div>
                        <Button size="sm" variant="ghost" disabled className="h-5">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs">
                        <div className="grid grid-cols-3 gap-2 bg-muted p-1">
                          <div>id</div>
                          <div>name</div>
                          <div>created_at</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-1 border-b">
                          <div>1</div>
                          <div>John Doe</div>
                          <div>2023-05-12</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-1 border-b">
                          <div>2</div>
                          <div>Jane Smith</div>
                          <div>2023-05-15</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Writing SQL Queries</h2>
          
          <Tabs defaultValue="basic" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Queries</TabsTrigger>
              <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="p-4 border rounded-md mt-2">
              <h3 className="text-lg font-semibold mb-3">Basic SQL Queries</h3>
              <p className="mb-4">
                Start with these basic queries to interact with your database:
              </p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                      <Table2 className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold">SELECT Queries</h4>
                  </div>
                  <div className="bg-muted p-3 rounded-md text-sm font-mono">
                    <div>-- Retrieve all columns from a table</div>
                    <div>SELECT * FROM table_name;</div>
                    <div className="mt-2">-- Retrieve specific columns</div>
                    <div>SELECT column1, column2 FROM table_name;</div>
                    <div className="mt-2">-- Apply a simple filter</div>
                    <div>SELECT * FROM table_name WHERE column_name = &#39;value&#39;;</div>
                    <div className="mt-2">-- Sort results</div>
                    <div>SELECT * FROM table_name ORDER BY column_name ASC;</div>
                    <div className="mt-2">-- Limit results</div>
                    <div>SELECT * FROM table_name LIMIT 10;</div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                      <Pencil className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold">INSERT Statements</h4>
                  </div>
                  <div className="bg-muted p-3 rounded-md text-sm font-mono">
                    <div>-- Insert a new row</div>
                    <div>INSERT INTO table_name (column1, column2)</div>
                    <div>VALUES (&#39;value1&#39;, &#39;value2&#39;);</div>
                    <div className="mt-2">-- Insert multiple rows</div>
                    <div>INSERT INTO table_name (column1, column2)</div>
                    <div>VALUES</div>
                    <div>  (&#39;value1&#39;, &#39;value2&#39;),</div>
                    <div>  (&#39;value3&#39;, &#39;value4&#39;);</div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="intermediate" className="p-4 border rounded-md mt-2">
              <h3 className="text-lg font-semibold mb-3">Intermediate SQL Queries</h3>
              <p className="mb-4">
                Expand your SQL knowledge with these intermediate concepts:
              </p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                      <Table2 className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold">JOIN Operations</h4>
                  </div>
                  <div className="bg-muted p-3 rounded-md text-sm font-mono">
                    <div>-- Inner join between two tables</div>
                    <div>SELECT a.column1, b.column2</div>
                    <div>FROM table_a AS a</div>
                    <div>JOIN table_b AS b ON a.id = b.a_id;</div>
                    <div className="mt-2">-- Left join (keep all rows from left table)</div>
                    <div>SELECT a.column1, b.column2</div>
                    <div>FROM table_a AS a</div>
                    <div>LEFT JOIN table_b AS b ON a.id = b.a_id;</div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                      <Code className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold">Aggregation Functions</h4>
                  </div>
                  <div className="bg-muted p-3 rounded-md text-sm font-mono">
                    <div>-- Count records</div>
                    <div>SELECT COUNT(*) FROM table_name;</div>
                    <div className="mt-2">-- Group by with aggregation</div>
                    <div>SELECT category, AVG(price) as avg_price</div>
                    <div>FROM products</div>
                    <div>GROUP BY category;</div>
                    <div className="mt-2">-- Having clause (filter on aggregated data)</div>
                    <div>SELECT category, COUNT(*) as product_count</div>
                    <div>FROM products</div>
                    <div>GROUP BY category</div>
                    <div>HAVING COUNT(*) > 5;</div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="p-4 border rounded-md mt-2">
              <h3 className="text-lg font-semibold mb-3">Advanced SQL Queries</h3>
              <p className="mb-4">
                Master advanced SQL techniques with these examples:
              </p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                      <Code className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold">Common Table Expressions (CTEs)</h4>
                  </div>
                  <div className="bg-muted p-3 rounded-md text-sm font-mono">
                    <div>-- Basic CTE usage</div>
                    <div>WITH active_users AS (</div>
                    <div>  SELECT id, name, email</div>
                    <div>  FROM users</div>
                    <div>  WHERE status = &#39;active&#39;</div>
                    <div>)</div>
                    <div>SELECT * FROM active_users</div>
                    <div>WHERE created_at > &#39;2023-01-01&#39;;</div>
                    <div className="mt-2">-- Multiple CTEs</div>
                    <div>WITH active_users AS (</div>
                    <div>  SELECT id, name, email FROM users WHERE status = &#39;active&#39;</div>
                    <div>),</div>
                    <div>recent_orders AS (</div>
                    <div>  SELECT user_id, COUNT(*) as order_count</div>
                    <div>  FROM orders</div>
                    <div>  WHERE created_at > &#39;2023-06-01&#39;</div>
                    <div>  GROUP BY user_id</div>
                    <div>)</div>
                    <div>SELECT u.name, o.order_count</div>
                    <div>FROM active_users u</div>
                    <div>JOIN recent_orders o ON u.id = o.user_id;</div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                      <Settings className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold">Window Functions</h4>
                  </div>
                  <div className="bg-muted p-3 rounded-md text-sm font-mono">
                    <div>-- Row numbering within partitions</div>
                    <div>SELECT</div>
                    <div>  id,</div>
                    <div>  name,</div>
                    <div>  department,</div>
                    <div>  salary,</div>
                    <div>  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rank</div>
                    <div>FROM employees;</div>
                    <div className="mt-2">-- Running totals</div>
                    <div>SELECT</div>
                    <div>  date,</div>
                    <div>  amount,</div>
                    <div>  SUM(amount) OVER (ORDER BY date) as running_total</div>
                    <div>FROM transactions;</div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">SQL Editor Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Play className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Query Execution</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Execute queries by clicking the Run button or using the keyboard shortcut 
                      Ctrl+Enter (Cmd+Enter on Mac). You can execute selected portions of a query by 
                      highlighting the text before running.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Save className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Saved Queries</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Save frequently used queries with a name and description. Access your saved queries 
                      from the Saved Queries panel. You can organize them by project or purpose for easy 
                      access.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <History className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Query History</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      All executed queries are saved in your query history with timestamps and execution 
                      results. Quickly reuse previous queries by selecting them from the history panel.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Download className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Export Results</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Export query results in multiple formats including CSV, JSON, Excel, and SQL 
                      INSERT statements. You can export all results or only selected rows.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="border rounded-md p-3">
              <div className="flex items-center gap-2 mb-3">
                <Keyboard className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Editor Shortcuts</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Execute query</span>
                  <code className="bg-muted px-2 py-0.5 rounded">Ctrl+Enter</code>
                </div>
                <div className="flex justify-between">
                  <span>Save query</span>
                  <code className="bg-muted px-2 py-0.5 rounded">Ctrl+S</code>
                </div>
                <div className="flex justify-between">
                  <span>Format SQL</span>
                  <code className="bg-muted px-2 py-0.5 rounded">Ctrl+Shift+F</code>
                </div>
                <div className="flex justify-between">
                  <span>Find</span>
                  <code className="bg-muted px-2 py-0.5 rounded">Ctrl+F</code>
                </div>
                <div className="flex justify-between">
                  <span>Replace</span>
                  <code className="bg-muted px-2 py-0.5 rounded">Ctrl+H</code>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-3">
              <div className="flex items-center gap-2 mb-3">
                <Keyboard className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Navigation Shortcuts</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Open saved queries</span>
                  <code className="bg-muted px-2 py-0.5 rounded">Alt+Q</code>
                </div>
                <div className="flex justify-between">
                  <span>Open history</span>
                  <code className="bg-muted px-2 py-0.5 rounded">Alt+H</code>
                </div>
                <div className="flex justify-between">
                  <span>Toggle schema browser</span>
                  <code className="bg-muted px-2 py-0.5 rounded">Alt+S</code>
                </div>
                <div className="flex justify-between">
                  <span>New query tab</span>
                  <code className="bg-muted px-2 py-0.5 rounded">Ctrl+T</code>
                </div>
                <div className="flex justify-between">
                  <span>Close query tab</span>
                  <code className="bg-muted px-2 py-0.5 rounded">Ctrl+W</code>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Best Practices</h2>
          
          <Alert className="mt-4">
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>SQL Query Optimization Tips</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Use specific column names instead of SELECT * to improve performance</li>
                <li>Create appropriate indexes for frequently queried columns</li>
                <li>Use EXPLAIN ANALYZE to understand query execution plans</li>
                <li>Limit result sets when working with large tables</li>
                <li>Use prepared statements for parameterized queries</li>
                <li>Avoid nested subqueries when CTEs or JOINs can be used instead</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-3">Working with Large Datasets</h3>
            <p>
              When working with large datasets in the SQL Editor, consider these techniques to improve 
              performance and usability:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
              <li>
                <span className="font-medium">Add LIMIT clauses</span> to your queries during development
              </li>
              <li>
                <span className="font-medium">Use data sampling</span> for exploratory analysis
              </li>
              <li>
                <span className="font-medium">Enable pagination</span> in the results view for better navigation
              </li>
              <li>
                <span className="font-medium">Create temporary views</span> for complex intermediate results
              </li>
              <li>
                <span className="font-medium">Schedule long-running queries</span> to execute during off-peak hours
              </li>
            </ul>
          </div>
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
              Next: Backup and Recovery Guide
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </ResponsiveContainer>
  )
} 