"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Save, Download, Clock, Star } from "lucide-react";
import { executeSQLQuery, savedQueries } from "@/lib/api/sql";

export default function SQLEditorPage() {
  const [sql, setSql] = useState<string>("-- Write your SQL query here\nSELECT * FROM users LIMIT 10;");
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState("results");
  const [executionDuration, setExecutionDuration] = useState<number | null>(null);
  const [editorTheme, setEditorTheme] = useState("vs-dark");

  // Execute query using our mock API
  const executeQuery = async () => {
    setIsExecuting(true);
    setError(null);
    setResults(null);
    
    try {
      const { data, error, duration } = await executeSQLQuery(sql);
      
      if (error) {
        setError(error);
        setActiveTab("messages");
      } else if (data) {
        setResults(data);
        setExecutionDuration(duration);
        setActiveTab("results");
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      setActiveTab("messages");
    } finally {
      setIsExecuting(false);
    }
  };

  // Get column headers from results
  const getHeaders = () => {
    if (!results || results.length === 0) return [];
    return Object.keys(results[0]);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SQL Editor</h2>
          <p className="text-muted-foreground">
            Write and execute SQL queries against your database
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={executeQuery} disabled={isExecuting}>
            <Play className="mr-2 h-4 w-4" />
            {isExecuting ? "Executing..." : "Run"}
          </Button>
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-16rem)]">
        {/* Left sidebar with saved queries */}
        <Card className="col-span-1 hidden lg:block">
          <CardHeader>
            <CardTitle>Saved Queries</CardTitle>
            <CardDescription>
              Your saved SQL queries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {savedQueries.map((query) => (
                <div 
                  key={query.id} 
                  className="p-3 border rounded-md cursor-pointer hover:bg-accent"
                  onClick={() => setSql(query.query)}
                >
                  <div className="font-medium">{query.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {query.createdAt}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-2">
                    {query.query}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main editor and results area */}
        <div className="col-span-1 lg:col-span-3 flex flex-col">
          {/* SQL editor */}
          <Card className="flex-1 flex flex-col mb-4">
            <CardHeader className="px-4 py-2 flex flex-row justify-between items-center">
              <CardTitle className="text-sm">Query Editor</CardTitle>
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setEditorTheme(editorTheme === "vs-dark" ? "vs-light" : "vs-dark")}
                >
                  Toggle Theme
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <Editor
                height="100%"
                defaultLanguage="sql"
                value={sql}
                onChange={(value) => setSql(value || "")}
                theme={editorTheme}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  automaticLayout: true,
                }}
              />
            </CardContent>
          </Card>

          {/* Results area */}
          <Card className="flex-1">
            <CardHeader className="px-4 py-2">
              <Tabs defaultValue="results" value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="results">Results</TabsTrigger>
                  <TabsTrigger value="messages">Messages</TabsTrigger>
                </TabsList>
                <TabsContent value="results" className="mt-2">
                  {results ? (
                    <div className="rounded-md border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {getHeaders().map((header, index) => (
                              <TableHead key={index}>{header}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {getHeaders().map((header, colIndex) => (
                                <TableCell key={colIndex}>{String(row[header])}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center">
                      <p className="text-muted-foreground">Execute a query to see results</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="messages" className="mt-2">
                  <div className="rounded-md border p-4">
                    {error ? (
                      <div className="text-sm">
                        <p className="text-red-500">{error}</p>
                      </div>
                    ) : results ? (
                      <div className="text-sm">
                        <p className="text-green-500">Query executed successfully</p>
                        <p className="text-muted-foreground mt-1">Returned {results.length} rows</p>
                        {executionDuration && (
                          <p className="text-muted-foreground mt-1">
                            Execution time: {executionDuration.toFixed(3)}s
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No messages yet</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
} 