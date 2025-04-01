"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Code, 
  Database, 
  CircleEqual,
  Download,
  Sparkles,
  PanelRightOpen
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Types
interface VectorCollection {
  id: string
  name: string
  description: string
  dimensions: number
  count: number
  type: "text" | "image" | "code" | "mixed"
  icon: React.ReactNode
}

interface VectorSearchResult {
  id: string
  text?: string
  imageUrl?: string
  code?: string
  metadata: Record<string, string | number | boolean>
  score: number
  distance?: number
}

type SearchMode = "text" | "image" | "code" | "file"

// Mock data for collections
const mockCollections: VectorCollection[] = [
  { 
    id: "documents", 
    name: "文档向量库", 
    description: "包含文档、文章和网页内容的向量集合", 
    dimensions: 1536, 
    count: 12458,
    type: "text",
    icon: <FileText className="h-5 w-5" />
  },
  { 
    id: "images", 
    name: "图像向量库", 
    description: "各类图像的向量嵌入集合", 
    dimensions: 1024, 
    count: 5743,
    type: "image",
    icon: <ImageIcon className="h-5 w-5" />
  },
  { 
    id: "code", 
    name: "代码向量库", 
    description: "代码片段的向量表示", 
    dimensions: 768, 
    count: 8923,
    type: "code",
    icon: <Code className="h-5 w-5" />
  },
  { 
    id: "products", 
    name: "产品向量库", 
    description: "产品描述和元数据的混合向量集合", 
    dimensions: 1536, 
    count: 3417,
    type: "mixed",
    icon: <Database className="h-5 w-5" />
  },
]

// Mock function to perform vector search
const performVectorSearch = async (
  collectionId: string, 
  query: string, 
  limit: number, 
  similarityThreshold: number,
  searchMode: SearchMode
): Promise<VectorSearchResult[]> => {
  // Simulate network request
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Return mock results based on collection type
  const collection = mockCollections.find(c => c.id === collectionId);
  if (!collection) return [];
  
  // Generate example results based on collection type
  switch (collection.type) {
    case "text":
      return Array(limit).fill(0).map((_, i) => ({
        id: `result-${i}`,
        text: `This is a sample text result that matches your query "${query}". It has a high similarity score.`,
        metadata: {
          source: `document-${i}.pdf`,
          date: new Date().toISOString().split('T')[0],
          author: ["John Doe", "Jane Smith"][Math.floor(Math.random() * 2)],
          category: ["Technical", "Business", "Research"][Math.floor(Math.random() * 3)]
        },
        score: Math.max(0.5, 1 - (i * 0.05)),
        distance: Math.min(0.5, i * 0.05)
      }));
    
    case "image":
      return Array(limit).fill(0).map((_, i) => ({
        id: `result-${i}`,
        imageUrl: `https://picsum.photos/seed/${i}/300/200`,
        metadata: {
          filename: `image-${i}.jpg`,
          dimensions: "1920x1080",
          format: ["JPEG", "PNG"][Math.floor(Math.random() * 2)],
          tags: ["nature", "landscape", "city", "people"][Math.floor(Math.random() * 4)]
        },
        score: Math.max(0.5, 1 - (i * 0.05)),
        distance: Math.min(0.5, i * 0.05)
      }));
    
    case "code":
      return Array(limit).fill(0).map((_, i) => ({
        id: `result-${i}`,
        code: `function calculateSimilarity(a, b) {\n  // Calculate cosine similarity between vectors\n  return dotProduct(a, b) / (magnitude(a) * magnitude(b));\n}`,
        metadata: {
          language: ["JavaScript", "Python", "TypeScript"][Math.floor(Math.random() * 3)],
          repository: `github.com/example/repo-${i}`,
          file: `similarity-${i}.js`,
          stars: Math.floor(Math.random() * 1000)
        },
        score: Math.max(0.5, 1 - (i * 0.05)),
        distance: Math.min(0.5, i * 0.05)
      }));
    
    case "mixed":
      return Array(limit).fill(0).map((_, i) => ({
        id: `result-${i}`,
        text: `Product ${i}: High-quality item with premium features.`,
        imageUrl: `https://picsum.photos/seed/product-${i}/300/200`,
        metadata: {
          product_id: `PROD-${1000 + i}`,
          price: Math.floor(Math.random() * 10000) / 100,
          category: ["Electronics", "Clothing", "Home", "Sports"][Math.floor(Math.random() * 4)],
          rating: (Math.floor(Math.random() * 50) + 1) / 10
        },
        score: Math.max(0.5, 1 - (i * 0.05)),
        distance: Math.min(0.5, i * 0.05)
      }));
    
    default:
      return [];
  }
};

export default function VectorSearchPage() {
  const [selectedCollection, setSelectedCollection] = useState<string>(mockCollections[0].id);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchLimit, setSearchLimit] = useState<number>(5);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.7);
  const [searchMode, setSearchMode] = useState<SearchMode>("text");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<VectorSearchResult[] | null>(null);
  const [activeTab, setActiveTab] = useState<string>("search");
  const [modelType, setModelType] = useState<string>("openai");
  const [visualizeResults, setVisualizeResults] = useState<boolean>(false);
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "请输入搜索内容",
        description: "搜索内容不能为空",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearching(true);
    setSearchResults(null);
    
    try {
      const results = await performVectorSearch(
        selectedCollection,
        searchQuery,
        searchLimit,
        similarityThreshold,
        searchMode
      );
      
      setSearchResults(results);
      
      toast({
        title: "搜索完成",
        description: `找到 ${results.length} 个结果`,
      });
    } catch (error) {
      toast({
        title: "搜索失败",
        description: error instanceof Error ? error.message : "发生未知错误",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  const selectedCollectionData = mockCollections.find(c => c.id === selectedCollection);
  
  const exportResults = () => {
    if (!searchResults) return;
    
    try {
      // Convert to JSON
      const jsonData = JSON.stringify(searchResults, null, 2);
      
      // Create and download file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vector-search-results-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      toast({
        title: "导出成功",
        description: "搜索结果已导出为 JSON 文件",
      });
    } catch (error) {
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "导出结果时发生错误",
        variant: "destructive",
      });
    }
  };
  
  // Format distance for display
  const formatDistance = (distance?: number) => {
    if (distance === undefined) return "-";
    return distance.toFixed(4);
  };
  
  // Format similarity score for display
  const formatScore = (score: number) => {
    return (score * 100).toFixed(2) + "%";
  };
  
  return (
    <div className="container mx-auto space-y-6 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">向量检索</h1>
          <p className="text-muted-foreground">基于语义相似度在向量集合中搜索</p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="search">向量搜索</TabsTrigger>
          <TabsTrigger value="benchmark">性能评测</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Search panel */}
            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>搜索设置</CardTitle>
                  <CardDescription>配置向量搜索参数</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="collection">选择向量集合</Label>
                    <Select 
                      value={selectedCollection} 
                      onValueChange={setSelectedCollection}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择集合" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockCollections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            <div className="flex items-center">
                              {collection.icon}
                              <span className="ml-2">{collection.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedCollectionData && (
                      <div className="text-xs text-muted-foreground mt-2">
                        <div className="flex items-center justify-between">
                          <span>维度: {selectedCollectionData.dimensions}</span>
                          <span>数据量: {selectedCollectionData.count.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="model">嵌入模型</Label>
                    <Select 
                      value={modelType} 
                      onValueChange={setModelType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择模型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI Embedding</SelectItem>
                        <SelectItem value="bge">BGE Embedding</SelectItem>
                        <SelectItem value="e5">E5 Large v2</SelectItem>
                        <SelectItem value="bert">Chinese BERT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="searchMode">搜索类型</Label>
                    <RadioGroup 
                      value={searchMode} 
                      onValueChange={(value) => setSearchMode(value as SearchMode)}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="text" id="text" />
                        <Label htmlFor="text" className="cursor-pointer">文本搜索</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="image" id="image" />
                        <Label htmlFor="image" className="cursor-pointer">图像搜索</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="code" id="code" />
                        <Label htmlFor="code" className="cursor-pointer">代码搜索</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="file" id="file" />
                        <Label htmlFor="file" className="cursor-pointer">文件搜索</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="limit">结果数量</Label>
                      <span className="text-sm text-muted-foreground">{searchLimit}</span>
                    </div>
                    <Slider
                      id="limit"
                      min={1}
                      max={20}
                      step={1}
                      value={[searchLimit]}
                      onValueChange={(values) => setSearchLimit(values[0])}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="threshold">相似度阈值</Label>
                      <span className="text-sm text-muted-foreground">{similarityThreshold.toFixed(2)}</span>
                    </div>
                    <Slider
                      id="threshold"
                      min={0}
                      max={1}
                      step={0.01}
                      value={[similarityThreshold]}
                      onValueChange={(values) => setSimilarityThreshold(values[0])}
                    />
                  </div>
                  
                  <div className="pt-2">
                    <Label htmlFor="query">搜索内容</Label>
                    <Textarea
                      id="query"
                      placeholder="输入搜索文本、代码或上传文件..."
                      className="h-24 mt-2"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline"
                    onClick={() => setVisualizeResults(!visualizeResults)}
                    className="flex items-center gap-1"
                  >
                    {visualizeResults ? (
                      <>
                        <PanelRightOpen className="h-4 w-4" />
                        列表视图
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        可视化
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleSearch} 
                    disabled={isSearching}
                    className="min-w-[120px]"
                  >
                    {isSearching ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        搜索中...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        向量搜索
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            {/* Results panel */}
            <div className="md:col-span-2 space-y-4">
              {searchResults === null ? (
                <Card className="min-h-[300px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>输入搜索内容并点击"向量搜索"按钮</p>
                  </div>
                </Card>
              ) : searchResults.length === 0 ? (
                <Card className="min-h-[300px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <CircleEqual className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>未找到匹配结果</p>
                  </div>
                </Card>
              ) : visualizeResults ? (
                // Visualization view (simplified 2D plot)
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>向量可视化</CardTitle>
                      <Button variant="outline" size="sm" onClick={exportResults}>
                        <Download className="mr-2 h-4 w-4" />
                        导出结果
                      </Button>
                    </div>
                    <Separator />
                  </CardHeader>
                  <CardContent>
                    <div className="h-[500px] border rounded-md p-4 relative">
                      {/* Simplified 2D vector visualization - in a real app this would use a proper graph library */}
                      <div className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-blue-500 transform -translate-x-1/2 -translate-y-1/2" />
                      <div className="absolute top-1/2 left-1/2 w-24 h-24 rounded-full border border-blue-200 transform -translate-x-1/2 -translate-y-1/2" />
                      <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full border border-blue-100 transform -translate-x-1/2 -translate-y-1/2" />
                      
                      {searchResults.map((result, index) => {
                        // Calculate position based on similarity (this is a simplified visualization)
                        const angle = (index / searchResults.length) * Math.PI * 2;
                        const distance = (1 - result.score) * 200 + 30;
                        const top = `calc(50% + ${Math.sin(angle) * distance}px)`;
                        const left = `calc(50% + ${Math.cos(angle) * distance}px)`;
                        
                        return (
                          <div 
                            key={result.id}
                            className="absolute w-2 h-2 rounded-full bg-primary transform -translate-x-1/2 -translate-y-1/2 hover:w-3 hover:h-3 transition-all"
                            style={{ top, left }}
                            title={`${result.id} - Score: ${formatScore(result.score)}`}
                          />
                        );
                      })}
                      
                      <div className="absolute bottom-4 right-4 text-sm text-muted-foreground">
                        <p>中心点: 查询向量</p>
                        <p>距离: 基于余弦相似度</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                // List view
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>搜索结果</CardTitle>
                      <Button variant="outline" size="sm" onClick={exportResults}>
                        <Download className="mr-2 h-4 w-4" />
                        导出结果
                      </Button>
                    </div>
                    <Separator />
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-[600px]">
                      <div className="space-y-4">
                        {searchResults.map((result, index) => (
                          <div
                            key={result.id}
                            className="border rounded-lg p-4 transition-colors hover:bg-muted/50"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">#{index + 1}</Badge>
                                <span className="font-medium">{result.id}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-primary font-semibold">{formatScore(result.score)}</span>
                                <span className="text-muted-foreground ml-2">
                                  (距离: {formatDistance(result.distance)})
                                </span>
                              </div>
                            </div>
                            
                            {result.text && (
                              <div className="mb-3">
                                <p className="text-sm">{result.text}</p>
                              </div>
                            )}
                            
                            {result.imageUrl && (
                              <div className="mb-3">
                                <img 
                                  src={result.imageUrl} 
                                  alt={`Result ${index}`} 
                                  className="rounded-md max-h-[200px] object-cover"
                                />
                              </div>
                            )}
                            
                            {result.code && (
                              <div className="mb-3">
                                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                                  <code>{result.code}</code>
                                </pre>
                              </div>
                            )}
                            
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground font-medium mb-1">元数据:</p>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(result.metadata).map(([key, value]) => (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {key}: {value.toString()}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="benchmark" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>向量检索性能评测</CardTitle>
              <CardDescription>比较不同模型和配置的检索性能</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  性能评测功能将在未来版本中提供。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 