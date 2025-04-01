"use client";

import { Metadata } from "next"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Code, Database, LineChart, Copy } from "lucide-react"

export const metadata: Metadata = {
  title: "AI Assistant | LumosDB",
  description: "AI-powered assistant for SQL queries and data analysis",
}

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState("")
  const [modelType, setModelType] = useState("gpt-4")
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("sql-generator")
  
  // Mock function for SQL generation
  const generateSQL = async () => {
    setIsGenerating(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsGenerating(false)
  }
  
  // Example SQL generation results
  const sqlResults = [
    {
      prompt: "Find all users who signed up in the last 30 days",
      sql: `SELECT * FROM users
WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
ORDER BY created_at DESC;`,
      explanation: "This query selects all records from the users table where the created_at date is within the last 30 days, ordering the results by the creation date in descending order."
    },
    {
      prompt: "Count products by category with price statistics",
      sql: `SELECT 
  category,
  COUNT(*) as product_count,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(price) as avg_price
FROM products
GROUP BY category
ORDER BY product_count DESC;`,
      explanation: "This query counts the number of products in each category and calculates the minimum, maximum, and average prices. Results are grouped by category and ordered by the product count in descending order."
    }
  ]
  
  // Example data analysis results
  const analysisResults = [
    {
      prompt: "Analyze the transaction data for unusual patterns",
      insights: [
        "Transaction volume spikes on weekends, with Saturday showing 42% higher activity than weekdays",
        "22% of transactions over $500 occur between 2-4 AM, which is unusual and may indicate potential fraud",
        "Transactions from IP addresses in region X have a 3x higher chargeback rate"
      ],
      recommendations: [
        "Implement additional verification for high-value transactions during off-hours",
        "Consider rate limiting for accounts with unusual activity patterns",
        "Review authentication mechanisms for transactions from high-risk regions"
      ]
    }
  ]

  return (
    <ResponsiveContainer className="space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">AI Assistant</h2>
        <Select value={modelType} onValueChange={setModelType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
            <SelectItem value="gpt-4">GPT-4</SelectItem>
            <SelectItem value="claude">Claude</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Tabs defaultValue="sql-generator" onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="sql-generator" className="flex items-center">
            <Code className="mr-2 h-4 w-4" />
            SQL Generator
          </TabsTrigger>
          <TabsTrigger value="data-analyzer" className="flex items-center">
            <LineChart className="mr-2 h-4 w-4" />
            Data Analyzer
          </TabsTrigger>
          <TabsTrigger value="schema-helper" className="flex items-center">
            <Database className="mr-2 h-4 w-4" />
            Schema Helper
          </TabsTrigger>
        </TabsList>
        
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "sql-generator" && "Generate SQL Queries"}
              {activeTab === "data-analyzer" && "Analyze Data Patterns"}
              {activeTab === "schema-helper" && "Database Schema Assistant"}
            </CardTitle>
            <CardDescription>
              {activeTab === "sql-generator" && "Describe what you want to query in natural language"}
              {activeTab === "data-analyzer" && "Describe what insights you're looking for in your data"}
              {activeTab === "schema-helper" && "Get help with database schema design and optimization"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder={
                  activeTab === "sql-generator" 
                    ? "E.g., Find all users who haven't logged in for the past 30 days" 
                    : activeTab === "data-analyzer"
                      ? "E.g., Analyze our transaction data for unusual patterns"
                      : "E.g., Help me design a schema for a blog with comments and tags"
                }
                className="min-h-[120px] resize-y"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              
              <div className="flex flex-col space-y-2">
                <div className="text-sm text-muted-foreground">Example prompts:</div>
                <div className="flex flex-wrap gap-2">
                  {activeTab === "sql-generator" && (
                    <>
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => setPrompt("Find all users who signed up in the last 30 days")}
                      >
                        Find recent users
                      </Badge>
                      <Badge 
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => setPrompt("Count products by category with price statistics")}
                      >
                        Product statistics
                      </Badge>
                      <Badge 
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => setPrompt("Create a query to find orders with more than 5 items that haven't been shipped")}
                      >
                        Unshipped large orders
                      </Badge>
                    </>
                  )}
                  
                  {activeTab === "data-analyzer" && (
                    <>
                      <Badge 
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => setPrompt("Analyze the transaction data for unusual patterns")}
                      >
                        Transaction patterns
                      </Badge>
                      <Badge 
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => setPrompt("Look for correlations between customer age and purchase value")}
                      >
                        Age/purchase correlation
                      </Badge>
                      <Badge 
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => setPrompt("Identify potential data quality issues in our user records")}
                      >
                        Data quality check
                      </Badge>
                    </>
                  )}
                  
                  {activeTab === "schema-helper" && (
                    <>
                      <Badge 
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => setPrompt("Design a schema for an e-commerce platform with products, orders, and customers")}
                      >
                        E-commerce schema
                      </Badge>
                      <Badge 
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => setPrompt("How should I optimize my customer table for frequent searches by email and name?")}
                      >
                        Index optimization
                      </Badge>
                      <Badge 
                        variant="outline"
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => setPrompt("Convert my MongoDB collection structure to a relational database schema")}
                      >
                        NoSQL to SQL conversion
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setPrompt("")}>
              Clear
            </Button>
            <Button 
              onClick={generateSQL} 
              disabled={!prompt.trim() || isGenerating}
            >
              {isGenerating ? 
                "Generating..." : 
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate
                </>
              }
            </Button>
          </CardFooter>
        </Card>
        
        <TabsContent value="sql-generator" className="space-y-4 mt-4">
          {sqlResults.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Generated SQL</CardTitle>
                <CardDescription>{result.prompt}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <pre className="p-4 rounded-md bg-muted overflow-x-auto text-sm">
                    <code>{result.sql}</code>
                  </pre>
                  <Button 
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => navigator.clipboard.writeText(result.sql)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Explanation</h4>
                  <p className="text-sm text-muted-foreground">{result.explanation}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="ml-auto">
                    Execute Query
                  </Button>
                  <Button size="sm" variant="secondary">
                    Save Query
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="data-analyzer" className="space-y-4 mt-4">
          {analysisResults.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Data Analysis</CardTitle>
                <CardDescription>{result.prompt}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Key Insights</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.insights.map((insight, i) => (
                      <li key={i} className="text-sm">{insight}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="ml-auto">
                    Generate Report
                  </Button>
                  <Button size="sm" variant="secondary">
                    Create Visualization
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="schema-helper" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">This feature is coming soon</CardTitle>
              <CardDescription>
                The schema helper is currently under development. Check back soon!
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </ResponsiveContainer>
  )
} 