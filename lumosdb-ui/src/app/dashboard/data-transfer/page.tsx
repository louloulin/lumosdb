"use client"

import { useState } from "react"
import { Metadata } from "next"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, Download, Database, FileText, Loader2, HardDrive, CheckCircle, X, Grid3X3 } from "lucide-react"

export const metadata: Metadata = {
  title: "Data Transfer | LumosDB",
  description: "Import and export data in various formats",
}

export default function DataTransferPage() {
  const [activeTab, setActiveTab] = useState("import")
  const [selectedDatabase, setSelectedDatabase] = useState("sqlite")
  const [selectedTable, setSelectedTable] = useState("")
  const [selectedFormat, setSelectedFormat] = useState("csv")
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null)
  const [exportSuccess, setExportSuccess] = useState<boolean | null>(null)
  
  // Mock database tables
  const databaseTables = {
    sqlite: ["users", "products", "orders", "categories", "customers"],
    duckdb: ["analytics_data", "web_logs", "transactions", "daily_metrics"],
    vectors: ["product_embeddings", "image_vectors", "text_embeddings"]
  }
  
  // Mock import function
  const handleImport = async () => {
    setIsLoading(true)
    setProgress(0)
    setImportSuccess(null)
    
    // Simulate file upload progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 300)
    
    // Simulate completion
    setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      setIsLoading(false)
      setImportSuccess(Math.random() > 0.1) // 90% success rate
    }, 3500)
  }
  
  // Mock export function
  const handleExport = async () => {
    setIsLoading(true)
    setProgress(0)
    setExportSuccess(null)
    
    // Simulate export progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 15
      })
    }, 200)
    
    // Simulate completion
    setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      setIsLoading(false)
      setExportSuccess(true)
    }, 2000)
  }
  
  // Get available tables based on selected database
  const getAvailableTables = () => {
    if (selectedDatabase === "sqlite") return databaseTables.sqlite
    if (selectedDatabase === "duckdb") return databaseTables.duckdb
    return databaseTables.vectors
  }
  
  // Get available formats based on selected database
  const getAvailableFormats = () => {
    if (selectedDatabase === "vectors") {
      return [
        { value: "json", label: "JSON" },
        { value: "npy", label: "NumPy (.npy)" },
        { value: "parquet", label: "Parquet" }
      ]
    }
    
    return [
      { value: "csv", label: "CSV" },
      { value: "json", label: "JSON" },
      { value: "sql", label: "SQL" },
      { value: "xlsx", label: "Excel (.xlsx)" },
      { value: "parquet", label: "Parquet" }
    ]
  }
  
  // Get appropriate database icon
  const getDatabaseIcon = () => {
    switch (selectedDatabase) {
      case "sqlite":
        return <Database className="h-4 w-4" />
      case "duckdb":
        return <HardDrive className="h-4 w-4" />
      case "vectors":
        return <Grid3X3 className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
    }
  }
  
  return (
    <ResponsiveContainer className="space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Data Transfer</h2>
      </div>

      <Tabs defaultValue="import" onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="import" className="flex items-center">
            <Upload className="mr-2 h-4 w-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </TabsTrigger>
        </TabsList>
        
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "import" ? "Import Data" : "Export Data"}
            </CardTitle>
            <CardDescription>
              {activeTab === "import" 
                ? "Import data from file into selected database and table"
                : "Export data from selected database and table to file"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="database">Database</Label>
                <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select database" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sqlite">SQLite</SelectItem>
                    <SelectItem value="duckdb">DuckDB</SelectItem>
                    <SelectItem value="vectors">Vector Database</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="table">Table/Collection</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableTables().map(table => (
                      <SelectItem key={table} value={table}>
                        {table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="format">File Format</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableFormats().map(format => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {activeTab === "import" && (
              <div className="space-y-2">
                <Label htmlFor="file">File Upload</Label>
                <div className="border border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                  <FileText className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop your file here, or click to browse
                  </p>
                  <Input 
                    id="file" 
                    type="file" 
                    className="hidden" 
                    accept={
                      selectedFormat === "csv" ? ".csv" : 
                      selectedFormat === "json" ? ".json" :
                      selectedFormat === "sql" ? ".sql" :
                      selectedFormat === "xlsx" ? ".xlsx" :
                      selectedFormat === "parquet" ? ".parquet" :
                      selectedFormat === "npy" ? ".npy" : undefined
                    }
                  />
                  <Button variant="outline" onClick={() => document.getElementById("file")?.click()}>
                    Select File
                  </Button>
                </div>
              </div>
            )}
            
            {activeTab === "export" && (
              <div className="space-y-2">
                <Label htmlFor="options">Export Options</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm" htmlFor="includeHeaders">
                      Include Headers
                      <Input type="checkbox" id="includeHeaders" className="ml-2" defaultChecked />
                    </Label>
                  </div>
                  
                  {selectedDatabase !== "vectors" && (
                    <div className="space-y-2">
                      <Label className="text-sm" htmlFor="exportSchema">
                        Include Schema
                        <Input type="checkbox" id="exportSchema" className="ml-2" defaultChecked />
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {isLoading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            
            {importSuccess === true && (
              <Alert className="bg-green-50 border-green-500">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Import Successful</AlertTitle>
                <AlertDescription>
                  Data has been successfully imported into {selectedDatabase}.{selectedTable}
                </AlertDescription>
              </Alert>
            )}
            
            {importSuccess === false && (
              <Alert className="bg-red-50 border-red-500">
                <X className="h-4 w-4 text-red-600" />
                <AlertTitle>Import Failed</AlertTitle>
                <AlertDescription>
                  There was an error importing your data. Please check the file format and try again.
                </AlertDescription>
              </Alert>
            )}
            
            {exportSuccess === true && (
              <Alert className="bg-green-50 border-green-500">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Export Successful</AlertTitle>
                <AlertDescription>
                  Data has been successfully exported from {selectedDatabase}.{selectedTable}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center">
              {getDatabaseIcon()}
              <Badge variant="outline" className="ml-2">
                {selectedDatabase} / {selectedTable || "No table selected"}
              </Badge>
              <Badge variant="outline" className="ml-2">
                {selectedFormat.toUpperCase()}
              </Badge>
            </div>
            
            <Button 
              onClick={activeTab === "import" ? handleImport : handleExport}
              disabled={isLoading || !selectedTable}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {activeTab === "import" ? "Importing..." : "Exporting..."}
                </>
              ) : (
                <>
                  {activeTab === "import" ? (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </>
                  )}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent Imports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  {
                    date: "2023-06-15 13:45",
                    database: "duckdb",
                    table: "transactions",
                    format: "JSON",
                    status: "success",
                    rows: 1245
                  },
                  {
                    date: "2023-06-13 11:15",
                    database: "sqlite",
                    table: "products",
                    format: "XLSX",
                    status: "failed",
                    rows: 0
                  }
                ].map((operation, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between border p-3 rounded-md">
                    <div className="flex items-center">
                      <Upload className="h-4 w-4 mr-2 text-blue-500" />
                      <div>
                        <div className="font-medium text-sm">
                          Import to {operation.database}.{operation.table}
                        </div>
                        <div className="text-xs text-muted-foreground">{operation.date}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center mt-2 sm:mt-0">
                      <Badge variant="outline" className="mr-2">{operation.format}</Badge>
                      {operation.status === "success" ? (
                        <Badge className="bg-green-500">{operation.rows} rows</Badge>
                      ) : (
                        <Badge className="bg-red-500">Failed</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent Exports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  {
                    date: "2023-06-15 14:30",
                    database: "sqlite",
                    table: "users",
                    format: "CSV",
                    status: "success",
                    rows: 532
                  },
                  {
                    date: "2023-06-14 17:22",
                    database: "vectors",
                    table: "product_embeddings",
                    format: "NPY",
                    status: "success",
                    rows: 3124
                  }
                ].map((operation, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between border p-3 rounded-md">
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-2 text-green-500" />
                      <div>
                        <div className="font-medium text-sm">
                          Export from {operation.database}.{operation.table}
                        </div>
                        <div className="text-xs text-muted-foreground">{operation.date}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center mt-2 sm:mt-0">
                      <Badge variant="outline" className="mr-2">{operation.format}</Badge>
                      <Badge className="bg-green-500">{operation.rows} rows</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ResponsiveContainer>
  )
} 