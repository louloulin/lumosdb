"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle, Code, ExternalLink, PlayCircle, Loader } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getApiKeys } from "@/lib/api/auth"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ApiEndpoint {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  requiredAuth: boolean
  parameters?: ApiParameter[]
  responseExample: string
  category: 'sqlite' | 'duckdb' | 'vectors' | 'auth' | 'system'
}

interface ApiParameter {
  name: string
  type: string
  description: string
  required: boolean
}

const apiEndpoints: ApiEndpoint[] = [
  {
    id: "get-tables",
    method: "GET",
    path: "/api/sqlite/tables",
    description: "获取所有SQLite表",
    requiredAuth: true,
    responseExample: `{
  "tables": [
    {
      "name": "users",
      "rowCount": 150,
      "createdAt": "2024-01-15"
    },
    {
      "name": "products",
      "rowCount": 432,
      "createdAt": "2024-01-20"
    }
  ]
}`,
    category: "sqlite"
  },
  {
    id: "get-table-structure",
    method: "GET",
    path: "/api/sqlite/tables/:tableName",
    description: "获取表结构",
    requiredAuth: true,
    parameters: [
      {
        name: "tableName",
        type: "string",
        description: "表名",
        required: true
      }
    ],
    responseExample: `{
  "table": {
    "name": "users",
    "columns": [
      {
        "name": "id",
        "type": "INTEGER",
        "primaryKey": true,
        "autoIncrement": true,
        "nullable": false
      },
      {
        "name": "email",
        "type": "TEXT",
        "unique": true,
        "nullable": false
      },
      {
        "name": "name",
        "type": "TEXT",
        "nullable": false
      },
      {
        "name": "created_at",
        "type": "TIMESTAMP",
        "default": "CURRENT_TIMESTAMP",
        "nullable": false
      }
    ],
    "indexes": [
      {
        "name": "idx_users_email",
        "columns": ["email"],
        "unique": true
      }
    ]
  }
}`,
    category: "sqlite"
  },
  {
    id: "run-sql-query",
    method: "POST",
    path: "/api/sqlite/query",
    description: "执行SQL查询",
    requiredAuth: true,
    parameters: [
      {
        name: "sql",
        type: "string",
        description: "SQL查询语句",
        required: true
      },
      {
        name: "params",
        type: "array",
        description: "查询参数",
        required: false
      }
    ],
    responseExample: `{
  "results": {
    "rows": [
      { "id": 1, "name": "John Doe", "email": "john@example.com" },
      { "id": 2, "name": "Jane Smith", "email": "jane@example.com" }
    ],
    "rowCount": 2,
    "fields": [
      { "name": "id", "type": "integer" },
      { "name": "name", "type": "text" },
      { "name": "email", "type": "text" }
    ],
    "executionTime": 5
  }
}`,
    category: "sqlite"
  },
  {
    id: "duckdb-query",
    method: "POST",
    path: "/api/duckdb/query",
    description: "执行DuckDB分析查询",
    requiredAuth: true,
    parameters: [
      {
        name: "sql",
        type: "string",
        description: "DuckDB SQL查询语句",
        required: true
      }
    ],
    responseExample: `{
  "results": {
    "rows": [
      { "product_category": "Electronics", "total_sales": 125000, "avg_price": 450.25 },
      { "product_category": "Clothing", "total_sales": 78500, "avg_price": 65.99 }
    ],
    "rowCount": 2,
    "fields": [
      { "name": "product_category", "type": "VARCHAR" },
      { "name": "total_sales", "type": "DOUBLE" },
      { "name": "avg_price", "type": "DOUBLE" }
    ],
    "executionTime": 120
  }
}`,
    category: "duckdb"
  },
  {
    id: "vector-collections",
    method: "GET",
    path: "/api/vectors/collections",
    description: "获取所有向量集合",
    requiredAuth: true,
    responseExample: `{
  "collections": [
    {
      "name": "product_embeddings",
      "dimension": 384,
      "count": 1250,
      "createdAt": "2024-02-10"
    },
    {
      "name": "customer_profiles",
      "dimension": 1536,
      "count": 850,
      "createdAt": "2024-02-15"
    }
  ]
}`,
    category: "vectors"
  },
  {
    id: "vector-search",
    method: "POST",
    path: "/api/vectors/collections/:collectionName/search",
    description: "执行向量相似度搜索",
    requiredAuth: true,
    parameters: [
      {
        name: "collectionName",
        type: "string",
        description: "向量集合名称",
        required: true
      },
      {
        name: "query",
        type: "string",
        description: "搜索查询文本",
        required: true
      },
      {
        name: "limit",
        type: "number",
        description: "返回结果数量",
        required: false
      },
      {
        name: "filter",
        type: "object",
        description: "筛选条件",
        required: false
      }
    ],
    responseExample: `{
  "results": [
    {
      "id": "doc_123",
      "score": 0.92,
      "metadata": {
        "title": "iPhone 13",
        "category": "Electronics",
        "price": 999
      }
    },
    {
      "id": "doc_456",
      "score": 0.87,
      "metadata": {
        "title": "Samsung Galaxy S21",
        "category": "Electronics",
        "price": 899
      }
    }
  ],
  "executionTime": 25
}`,
    category: "vectors"
  },
  {
    id: "user-login",
    method: "POST",
    path: "/api/auth/login",
    description: "用户登录",
    requiredAuth: false,
    parameters: [
      {
        name: "email",
        type: "string",
        description: "用户邮箱",
        required: true
      },
      {
        name: "password",
        type: "string",
        description: "用户密码",
        required: true
      }
    ],
    responseExample: `{
  "user": {
    "id": "1",
    "email": "user@example.com",
    "name": "Example User",
    "role": "developer"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`,
    category: "auth"
  },
  {
    id: "system-status",
    method: "GET",
    path: "/api/system/status",
    description: "获取系统状态",
    requiredAuth: true,
    responseExample: `{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 259200,
  "sqlite": {
    "status": "connected",
    "dbSize": 152428800,
    "tableCount": 12
  },
  "duckdb": {
    "status": "connected",
    "memoryUsage": 524288000
  },
  "vectorDb": {
    "status": "connected",
    "collectionCount": 5
  }
}`,
    category: "system"
  }
];

export default function ApiDocsPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("documentation")
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null)
  const [testEndpoint, setTestEndpoint] = useState<ApiEndpoint | null>(null)
  const [method, setMethod] = useState<string>("GET")
  const [url, setUrl] = useState<string>("")
  const [requestBody, setRequestBody] = useState<string>("{}")
  const [headers, setHeaders] = useState<string>('{\n  "Content-Type": "application/json"\n}')
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [selectedApiKey, setSelectedApiKey] = useState<string>("")
  const [responseData, setResponseData] = useState<string>("")
  const [responseStatus, setResponseStatus] = useState<number | null>(null)
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [activeCategory, setActiveCategory] = useState<string>("all")

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login")
    } else {
      loadApiKeys()
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (testEndpoint) {
      setMethod(testEndpoint.method)
      setUrl(`https://api.lumosdb.dev${testEndpoint.path}`)
      
      // 如果有参数示例，则生成请求体示例
      if (testEndpoint.parameters && testEndpoint.method !== 'GET') {
        const exampleBody: Record<string, any> = {}
        testEndpoint.parameters.forEach(param => {
          if (!param.name.includes(':')) { // 忽略路径参数
            exampleBody[param.name] = param.type === 'string' 
              ? 'example' 
              : param.type === 'number' 
                ? 0 
                : param.type === 'array' 
                  ? [] 
                  : {}
          }
        })
        setRequestBody(JSON.stringify(exampleBody, null, 2))
      } else {
        setRequestBody("{}")
      }
      
      // 更新头部信息，包括认证
      if (testEndpoint.requiredAuth) {
        const authHeaders = {
          "Content-Type": "application/json",
          "Authorization": selectedApiKey ? `Bearer ${selectedApiKey}` : "Bearer YOUR_API_KEY"
        }
        setHeaders(JSON.stringify(authHeaders, null, 2))
      } else {
        setHeaders('{\n  "Content-Type": "application/json"\n}')
      }
    }
  }, [testEndpoint, selectedApiKey])

  const loadApiKeys = async () => {
    try {
      const keys = await getApiKeys()
      setApiKeys(keys)
      if (keys.length > 0) {
        setSelectedApiKey(`lmdb_xxx_${keys[0].prefix.split('_')[2]}...`)
      }
    } catch (err) {
      console.error("Failed to load API keys:", err)
    }
  }

  const handleSelectEndpoint = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint)
  }

  const handleTestEndpoint = (endpoint: ApiEndpoint) => {
    setTestEndpoint(endpoint)
    setActiveTab("testing")
    setResponseData("")
    setResponseStatus(null)
    setResponseTime(null)
    setError("")
  }

  const handleSendRequest = async () => {
    if (!testEndpoint) return
    
    setIsLoading(true)
    setError("")
    setResponseData("")
    setResponseStatus(null)
    setResponseTime(null)
    
    // 模拟API请求
    setTimeout(() => {
      try {
        // 在真实环境中，这里应该使用fetch或axios发送实际请求
        // 现在我们只是模拟返回预定义的响应
        setResponseStatus(200)
        setResponseData(testEndpoint.responseExample)
        setResponseTime(Math.floor(Math.random() * 100) + 50) // 模拟50-150ms的响应时间
      } catch (err) {
        setError("请求失败")
        setResponseStatus(500)
      } finally {
        setIsLoading(false)
      }
    }, 800) // 模拟网络延迟
  }

  const filteredEndpoints = activeCategory === 'all' 
    ? apiEndpoints 
    : apiEndpoints.filter(endpoint => endpoint.category === activeCategory)

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">API 文档与测试工具</h1>
        <p className="text-muted-foreground mt-2">
          浏览API端点详情，了解接口使用方法，并直接测试API请求。
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="documentation">
            <Code className="mr-2 h-4 w-4" />
            API 文档
          </TabsTrigger>
          <TabsTrigger value="testing">
            <PlayCircle className="mr-2 h-4 w-4" />
            API 测试工具
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documentation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>API 端点</CardTitle>
                  <CardDescription>
                    选择一个API端点查看详情
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="px-4 pb-2">
                    <Select 
                      value={activeCategory} 
                      onValueChange={setActiveCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有分类</SelectItem>
                        <SelectItem value="sqlite">SQLite</SelectItem>
                        <SelectItem value="duckdb">DuckDB</SelectItem>
                        <SelectItem value="vectors">向量存储</SelectItem>
                        <SelectItem value="auth">认证</SelectItem>
                        <SelectItem value="system">系统</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <ScrollArea className="h-[calc(100vh-350px)]">
                    <div className="divide-y">
                      {filteredEndpoints.map((endpoint) => (
                        <div
                          key={endpoint.id}
                          className={`px-4 py-3 cursor-pointer flex items-center hover:bg-muted ${
                            selectedEndpoint?.id === endpoint.id ? "bg-muted" : ""
                          }`}
                          onClick={() => handleSelectEndpoint(endpoint)}
                        >
                          <Badge 
                            variant={
                              endpoint.method === 'GET' ? "outline" :
                              endpoint.method === 'POST' ? "default" :
                              endpoint.method === 'PUT' ? "secondary" :
                              "destructive"
                            }
                            className="mr-3 min-w-16 justify-center"
                          >
                            {endpoint.method}
                          </Badge>
                          <div className="truncate">
                            {endpoint.path}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              {selectedEndpoint ? (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Badge 
                            variant={
                              selectedEndpoint.method === 'GET' ? "outline" :
                              selectedEndpoint.method === 'POST' ? "default" :
                              selectedEndpoint.method === 'PUT' ? "secondary" :
                              "destructive"
                            }
                            className="mr-2"
                          >
                            {selectedEndpoint.method}
                          </Badge>
                          {selectedEndpoint.path}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {selectedEndpoint.description}
                        </CardDescription>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleTestEndpoint(selectedEndpoint)}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        测试
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedEndpoint.requiredAuth && (
                      <Alert className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          此端点需要身份验证。请在请求中包含API密钥。
                        </AlertDescription>
                      </Alert>
                    )}

                    {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-lg font-medium mb-2">参数</h3>
                        <div className="border rounded-md">
                          <table className="min-w-full divide-y divide-border">
                            <thead>
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">参数名</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">类型</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">必填</th>
                                <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">描述</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {selectedEndpoint.parameters.map((param) => (
                                <tr key={param.name}>
                                  <td className="px-4 py-2 text-sm">{param.name}</td>
                                  <td className="px-4 py-2 text-sm font-mono">{param.type}</td>
                                  <td className="px-4 py-2 text-sm">
                                    {param.required ? (
                                      <Badge variant="default">是</Badge>
                                    ) : (
                                      <Badge variant="outline">否</Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-sm">{param.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-medium mb-2">响应示例</h3>
                      <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                        <code>{selectedEndpoint.responseExample}</code>
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center h-[calc(100vh-350px)] border rounded-lg">
                  <div className="text-center p-6">
                    <Code className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">选择一个API端点</h3>
                    <p className="text-muted-foreground mt-2">
                      从左侧列表中选择一个API端点以查看详细文档
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>请求设置</CardTitle>
                  <CardDescription>
                    配置您的API请求详情
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-1">
                      <Label htmlFor="method">方法</Label>
                      <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger id="method">
                          <SelectValue placeholder="选择方法" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label htmlFor="url">URL</Label>
                      <Input
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://api.lumosdb.dev/api/..."
                      />
                    </div>
                  </div>

                  {testEndpoint?.requiredAuth && (
                    <div>
                      <Label htmlFor="apiKey">API密钥</Label>
                      <Select 
                        value={selectedApiKey} 
                        onValueChange={setSelectedApiKey}
                      >
                        <SelectTrigger id="apiKey">
                          <SelectValue placeholder="选择API密钥" />
                        </SelectTrigger>
                        <SelectContent>
                          {apiKeys.length > 0 ? (
                            apiKeys.map((key) => (
                              <SelectItem 
                                key={key.id} 
                                value={`lmdb_xxx_${key.prefix.split('_')[2]}...`}
                              >
                                {key.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="">无可用API密钥</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="headers">请求头</Label>
                    <Textarea
                      id="headers"
                      value={headers}
                      onChange={(e) => setHeaders(e.target.value)}
                      className="font-mono text-sm"
                      rows={5}
                    />
                  </div>

                  {method !== 'GET' && (
                    <div>
                      <Label htmlFor="requestBody">请求体</Label>
                      <Textarea
                        id="requestBody"
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        className="font-mono text-sm"
                        rows={10}
                      />
                    </div>
                  )}
                </CardContent>
                <div className="px-6 pb-6">
                  <Button 
                    onClick={handleSendRequest} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    发送请求
                  </Button>
                </div>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>响应结果</span>
                    {responseStatus && (
                      <div className="flex items-center">
                        {responseStatus >= 200 && responseStatus < 300 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {responseStatus} OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Error {responseStatus}
                          </Badge>
                        )}
                        {responseTime && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            {responseTime}ms
                          </span>
                        )}
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription>
                    API响应详情
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="rounded-md border bg-muted">
                    <div className="flex items-center justify-between border-b px-4 py-2">
                      <div className="text-sm font-medium">响应体</div>
                      <Button variant="ghost" size="sm" className="h-7 gap-1">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="text-xs">复制</span>
                      </Button>
                    </div>
                    <ScrollArea className="h-[400px]">
                      {responseData ? (
                        <pre className="p-4 text-sm">
                          <code>{responseData}</code>
                        </pre>
                      ) : (
                        <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                          {isLoading ? "加载中..." : "发送请求以查看响应结果"}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 