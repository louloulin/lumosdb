"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Save, Download, Plus, BarChart3, LineChart, PieChart, FileSpreadsheet } from "lucide-react";
import Editor from "@monaco-editor/react";
import ChartDisplay from "@/components/analytics/chart-display";
import { analyticsQueries, executeAnalyticsQuery, getAnalyticsResults } from "@/lib/api/duckdb";

export default function DuckDBPage() {
  const [activeTab, setActiveTab] = useState<string>("queries");
  const [selectedQuery, setSelectedQuery] = useState<number | null>(null);
  const [queryInfo, setQueryInfo] = useState<any>(null);
  const [sql, setSql] = useState<string>("");
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionDuration, setExecutionDuration] = useState<number | null>(null);
  const [editorTheme, setEditorTheme] = useState("vs-dark");

  // Load query when selectedQuery changes
  useEffect(() => {
    if (selectedQuery !== null) {
      const query = analyticsQueries.find(q => q.id === selectedQuery);
      if (query) {
        setQueryInfo(query);
        setSql(query.query);
        // Load the results for this predefined query
        loadAnalyticsResults(query.resultTable);
      }
    } else {
      setQueryInfo(null);
      setResults(null);
    }
  }, [selectedQuery]);

  // Load analytics results from the API
  const loadAnalyticsResults = async (tableName: string) => {
    try {
      const data = await getAnalyticsResults(tableName);
      setResults(data);
      setError(null);
    } catch (err) {
      setError(`Error loading results: ${err instanceof Error ? err.message : String(err)}`);
      setResults(null);
    }
  };

  // Execute custom query
  const executeQuery = async () => {
    if (!sql.trim()) return;
    
    setIsExecuting(true);
    setError(null);
    
    try {
      const { data, error, duration } = await executeAnalyticsQuery(sql);
      
      if (error) {
        setError(error);
        setResults(null);
      } else {
        setResults(data);
        setExecutionDuration(duration);
        setError(null);
      }
    } catch (err) {
      setError(`Error executing query: ${err instanceof Error ? err.message : String(err)}`);
      setResults(null);
    } finally {
      setIsExecuting(false);
    }
  };

  // Get column headers from results
  const getHeaders = () => {
    if (!results || results.length === 0) return [];
    return Object.keys(results[0]);
  };

  // Determine the suitable keys for chart display
  const getChartKeys = () => {
    if (!results || results.length === 0) return { xKey: "", yKeys: [] };
    
    const keys = getHeaders();
    let xKey = '';
    let yKeys: string[] = [];
    
    // Find a suitable x-axis key (string or date)
    const stringKeys = keys.filter(key => 
      typeof results[0][key] === 'string' && !['id'].includes(key.toLowerCase())
    );
    
    if (stringKeys.length > 0) {
      xKey = stringKeys[0];
      // The remaining numeric keys will be y-axes
      yKeys = keys.filter(key => 
        typeof results[0][key] === 'number' && key !== xKey
      );
    } else {
      // Fallback to first key as x-axis if no string keys
      xKey = keys[0];
      yKeys = keys.slice(1).filter(key => typeof results[0][key] === 'number');
    }
    
    return { xKey, yKeys };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">DuckDB Analytics</h2>
          <p className="text-muted-foreground">
            Run analytical queries and visualize data with DuckDB
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={executeQuery} disabled={isExecuting}>
            <Play className="mr-2 h-4 w-4" />
            {isExecuting ? "Executing..." : "Run Query"}
          </Button>
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            New Query
          </Button>
        </div>
      </div>

      <Tabs defaultValue="queries" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queries">Saved Queries</TabsTrigger>
          <TabsTrigger value="editor">Query Editor</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="visualization">Visualization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="queries" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsQueries.map((query) => (
              <Card 
                key={query.id} 
                className={`cursor-pointer transition-shadow hover:shadow-md ${selectedQuery === query.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedQuery(query.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{query.name}</CardTitle>
                    {query.visualization === 'bar' && <BarChart3 className="h-5 w-5 text-muted-foreground" />}
                    {query.visualization === 'line' && <LineChart className="h-5 w-5 text-muted-foreground" />}
                    {query.visualization === 'pie' && <PieChart className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <CardDescription>{query.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded-md overflow-hidden text-ellipsis whitespace-nowrap">
                    {query.query.substring(0, 100)}{query.query.length > 100 ? '...' : ''}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="editor" className="space-y-4">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-2 flex flex-row justify-between items-center">
              <div>
                <CardTitle>{queryInfo?.name || "SQL Editor"}</CardTitle>
                <CardDescription>
                  {queryInfo?.description || "Write analytical SQL queries for DuckDB"}
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setEditorTheme(editorTheme === "vs-dark" ? "vs-light" : "vs-dark")}
              >
                Toggle Theme
              </Button>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="h-[400px] border rounded-md overflow-hidden">
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
              </div>
              {error && (
                <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              {executionDuration && !error && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Query executed in {executionDuration.toFixed(3)}s
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Query Results</CardTitle>
              <CardDescription>
                Data returned from the executed query
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results && results.length > 0 ? (
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {getHeaders().map((header, index) => (
                          <TableHead key={index}>{header.replace(/_/g, " ")}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {getHeaders().map((header, colIndex) => (
                            <TableCell key={colIndex}>
                              {typeof row[header] === 'number' 
                                ? Number(row[header]).toLocaleString() 
                                : String(row[header])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center">
                  <p className="text-muted-foreground">
                    {isExecuting ? "Executing query..." : "No results to display. Run a query to see results."}
                  </p>
                </div>
              )}
              {results && results.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export as CSV
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="visualization" className="space-y-4">
          {results && results.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bar Chart</CardTitle>
                  <CardDescription>Data visualization using bar chart</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartDisplay 
                    data={results} 
                    type="bar" 
                    {...getChartKeys()} 
                    height={300} 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Line Chart</CardTitle>
                  <CardDescription>Data visualization using line chart</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartDisplay 
                    data={results} 
                    type="line" 
                    {...getChartKeys()} 
                    height={300} 
                  />
                </CardContent>
              </Card>
              
              {getChartKeys().yKeys.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pie Chart</CardTitle>
                    <CardDescription>Data visualization using pie chart</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartDisplay 
                      data={results} 
                      type="pie" 
                      xKey={getChartKeys().xKey} 
                      yKeys={[getChartKeys().yKeys[0]]} 
                      height={300} 
                    />
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Chart Settings</CardTitle>
                  <CardDescription>Configure visualization options</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Data Overview</h4>
                      <p className="text-sm text-muted-foreground">
                        Showing {results.length} rows of data with {getHeaders().length} columns.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Visualization Dimensions</h4>
                      <p className="text-sm text-muted-foreground">
                        X-axis: <span className="font-mono">{getChartKeys().xKey}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Y-axis: <span className="font-mono">{getChartKeys().yKeys.join(", ")}</span>
                      </p>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export Chart
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        View Raw Data
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-[400px]">
                <p className="text-muted-foreground mb-4">
                  No data available for visualization. Run a query first.
                </p>
                <Button onClick={() => setActiveTab("editor")}>Go to Query Editor</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 