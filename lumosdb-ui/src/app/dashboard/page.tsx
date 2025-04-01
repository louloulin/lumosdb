import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatabaseIcon, Server, BoxSelect, ActivitySquare } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-3xl font-bold tracking-tight">Database Overview</h2>
      <p className="text-muted-foreground">
        Monitor your database statistics and performance metrics.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              SQLite Tables
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Transaction-based storage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              DuckDB Tables
            </CardTitle>
            <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Analytics-optimized storage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vector Collections
            </CardTitle>
            <BoxSelect className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              AI-powered vector storage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Queries</CardTitle>
            <ActivitySquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Currently running queries
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="recent">Recent Queries</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Health</CardTitle>
              <CardDescription>
                System metrics and performance insights
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">
                Performance metrics visualization will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>
                Query patterns and performance statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">
                Analytics charts will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Queries</CardTitle>
              <CardDescription>
                Last executed queries and their performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <div className="font-mono text-sm bg-muted p-2 rounded-md">
                    SELECT * FROM users WHERE last_login {'>'}; date(&apos;now&apos;, &apos;-7 days&apos;)
                  </div>
                  <div className="mt-2 text-sm flex justify-between">
                    <span className="text-muted-foreground">Executed 5 minutes ago</span>
                    <span className="text-muted-foreground">Duration: 0.023s</span>
                  </div>
                </div>
                <div className="border rounded-md p-4">
                  <div className="font-mono text-sm bg-muted p-2 rounded-md">
                    CREATE TABLE new_events (id INTEGER PRIMARY KEY, name TEXT, date TEXT)
                  </div>
                  <div className="mt-2 text-sm flex justify-between">
                    <span className="text-muted-foreground">Executed 15 minutes ago</span>
                    <span className="text-muted-foreground">Duration: 0.003s</span>
                  </div>
                </div>
                <div className="border rounded-md p-4">
                  <div className="font-mono text-sm bg-muted p-2 rounded-md">
                    SELECT vector_search('product_embeddings', 'modern office chair', 5)
                  </div>
                  <div className="mt-2 text-sm flex justify-between">
                    <span className="text-muted-foreground">Executed 25 minutes ago</span>
                    <span className="text-muted-foreground">Duration: 0.128s</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 