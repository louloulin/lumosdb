"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Book, 
  FileText, 
  Search, 
  ChevronRight, 
  FileQuestion, 
  BookOpen, 
  Code, 
  Database, 
  HardDrive, 
  BarChart3, 
  LayoutGrid,
  RefreshCw,
  ArrowRightLeft,
  Server,
  ShieldCheck
} from "lucide-react"

interface DocItem {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  icon: React.ReactNode
  updated: string
}

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  
  // Mock documentation data
  const docs: DocItem[] = [
    {
      id: "getting-started",
      title: "Getting Started with LumosDB",
      description: "Learn the basics of LumosDB and set up your first database",
      category: "guides",
      tags: ["beginner", "setup", "introduction"],
      icon: <BookOpen className="h-5 w-5" />,
      updated: "2023-12-10"
    },
    {
      id: "sqlite-integration",
      title: "SQLite Database Management",
      description: "How to create, manage, and optimize SQLite databases",
      category: "guides",
      tags: ["sqlite", "management", "optimization"],
      icon: <Database className="h-5 w-5" />,
      updated: "2023-12-15"
    },
    {
      id: "duckdb-guide",
      title: "Working with DuckDB",
      description: "Analytical queries and data processing with DuckDB",
      category: "guides",
      tags: ["duckdb", "analytics", "queries"],
      icon: <Database className="h-5 w-5" />,
      updated: "2023-12-20"
    },
    {
      id: "vector-search",
      title: "Vector Search Implementation",
      description: "Setting up and using vector databases for semantic search",
      category: "guides",
      tags: ["vector", "semantic-search", "embeddings"],
      icon: <Search className="h-5 w-5" />,
      updated: "2023-12-25"
    },
    {
      id: "sql-editor",
      title: "SQL Editor Tutorial",
      description: "Master the SQL Editor for efficient query development",
      category: "tutorials",
      tags: ["sql", "queries", "editor"],
      icon: <Code className="h-5 w-5" />,
      updated: "2024-01-05"
    },
    {
      id: "backup-recovery",
      title: "Backup and Recovery Guide",
      description: "Protect your data with automatic backups and recovery options",
      category: "tutorials",
      tags: ["backup", "recovery", "data-protection"],
      icon: <RefreshCw className="h-5 w-5" />,
      updated: "2024-01-10"
    },
    {
      id: "data-transfer",
      title: "Data Import and Export",
      description: "Transfer data between databases and external sources",
      category: "tutorials",
      tags: ["import", "export", "migration"],
      icon: <ArrowRightLeft className="h-5 w-5" />,
      updated: "2024-01-15"
    },
    {
      id: "system-monitoring",
      title: "System Monitoring Setup",
      description: "Monitor database performance and resource usage",
      category: "tutorials",
      tags: ["monitoring", "performance", "metrics"],
      icon: <BarChart3 className="h-5 w-5" />,
      updated: "2024-01-20"
    },
    {
      id: "api-reference",
      title: "API Reference",
      description: "Complete reference for the LumosDB API endpoints",
      category: "reference",
      tags: ["api", "reference", "endpoints"],
      icon: <Server className="h-5 w-5" />,
      updated: "2024-01-25"
    },
    {
      id: "security-best-practices",
      title: "Security Best Practices",
      description: "Secure your databases and protect sensitive data",
      category: "reference",
      tags: ["security", "encryption", "authentication"],
      icon: <ShieldCheck className="h-5 w-5" />,
      updated: "2024-01-30"
    },
    {
      id: "faq",
      title: "Frequently Asked Questions",
      description: "Common questions and answers about LumosDB",
      category: "reference",
      tags: ["faq", "help", "troubleshooting"],
      icon: <FileQuestion className="h-5 w-5" />,
      updated: "2024-02-05"
    },
    {
      id: "schema-management",
      title: "Database Schema Management",
      description: "Design, update, and optimize your database schemas",
      category: "guides",
      tags: ["schema", "design", "optimization"],
      icon: <LayoutGrid className="h-5 w-5" />,
      updated: "2024-02-10"
    }
  ]
  
  // Filter docs based on search and category
  const filteredDocs = docs.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
    const matchesCategory = activeCategory === "all" || doc.category === activeCategory
    
    return matchesSearch && matchesCategory
  })
  
  const categories = [
    { id: "all", name: "All Docs", icon: <Book className="h-4 w-4" /> },
    { id: "guides", name: "Guides", icon: <BookOpen className="h-4 w-4" /> },
    { id: "tutorials", name: "Tutorials", icon: <FileText className="h-4 w-4" /> },
    { id: "reference", name: "Reference", icon: <Code className="h-4 w-4" /> }
  ]
  
  return (
    <ResponsiveContainer className="space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Documentation</h2>
        <p className="text-muted-foreground">
          Learn how to use LumosDB and make the most of its features
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-72">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documentation..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pt-0 pb-2">
              <div className="space-y-1">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={activeCategory === category.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.icon}
                    <span className="ml-2">{category.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-base">Help & Support</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-2">
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <FileQuestion className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Code className="mr-2 h-4 w-4" />
                  GitHub Issues
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Book className="mr-2 h-4 w-4" />
                  Community Forums
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex-1">
          <Tabs defaultValue="featured">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="featured">Featured</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="popular">Popular</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">
                  {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
                </Badge>
              </div>
            </div>
            
            <TabsContent value="featured" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs.map((doc) => (
                  <Link 
                    key={doc.id} 
                    href={`/dashboard/docs/${doc.id}`}
                    className="block"
                  >
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader className="flex flex-row items-start space-y-0 pb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 mr-3">
                          {doc.icon}
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-base">{doc.title}</CardTitle>
                          <div className="flex flex-wrap gap-2">
                            {doc.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs font-normal">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      </CardContent>
                      <CardFooter className="flex justify-between text-sm text-muted-foreground">
                        <div>Updated: {doc.updated}</div>
                        <div className="flex items-center">
                          <span>Read</span>
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="recent" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs
                  .slice()
                  .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
                  .map((doc) => (
                    <Link 
                      key={doc.id} 
                      href={`/dashboard/docs/${doc.id}`}
                      className="block"
                    >
                      <Card className="h-full transition-shadow hover:shadow-md">
                        <CardHeader className="flex flex-row items-start space-y-0 pb-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 mr-3">
                            {doc.icon}
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-base">{doc.title}</CardTitle>
                            <div className="flex flex-wrap gap-2">
                              {doc.tags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs font-normal">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        </CardContent>
                        <CardFooter className="flex justify-between text-sm text-muted-foreground">
                          <div>Updated: {doc.updated}</div>
                          <div className="flex items-center">
                            <span>Read</span>
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </div>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
              </div>
            </TabsContent>
            
            <TabsContent value="popular" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Just a different ordering for this example */}
                {filteredDocs
                  .slice()
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((doc) => (
                    <Link 
                      key={doc.id} 
                      href={`/dashboard/docs/${doc.id}`}
                      className="block"
                    >
                      <Card className="h-full transition-shadow hover:shadow-md">
                        <CardHeader className="flex flex-row items-start space-y-0 pb-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 mr-3">
                            {doc.icon}
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-base">{doc.title}</CardTitle>
                            <div className="flex flex-wrap gap-2">
                              {doc.tags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs font-normal">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        </CardContent>
                        <CardFooter className="flex justify-between text-sm text-muted-foreground">
                          <div>Updated: {doc.updated}</div>
                          <div className="flex items-center">
                            <span>Read</span>
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </div>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ResponsiveContainer>
  )
} 