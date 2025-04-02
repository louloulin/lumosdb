"use client"

import Link from "next/link"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  BookOpen, 
  Database, 
  Code, 
  Grid3X3,
  Gauge,
  CircleHelp,
  ChevronRight,
  Server,
  BarChart2,
  ShieldCheck
} from "lucide-react"

export default function DocsPage() {
  return (
    <ResponsiveContainer className="max-w-6xl mx-auto p-6">
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-bold">LumosDB Documentation</h1>
          <p className="text-lg text-muted-foreground mt-2 mb-6">
            Comprehensive guides, tutorials, and reference materials for LumosDB
          </p>
          <Separator className="my-6" />
        </div>

        <section>
          <h2 className="text-2xl font-bold mb-6">Getting Started</h2>
          <Card className="hover:bg-accent/5 transition-colors">
            <Link href="/dashboard/docs/getting-started">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Getting Started Guide</CardTitle>
                  <CardDescription>
                    Your first steps with LumosDB - installation, setup, and first database creation
                  </CardDescription>
                </div>
                <div className="ml-auto">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
            </Link>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6">Database Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="col-span-1">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <CardTitle>Database Management</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li>
                    <Link 
                      href="/dashboard/docs/sqlite-integration" 
                      className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                    >
                      <Server className="h-4 w-4" />
                      <span>SQLite Database Management</span>
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/dashboard/docs/duckdb-guide" 
                      className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                    >
                      <BarChart2 className="h-4 w-4" />
                      <span>DuckDB Analytics Guide</span>
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/dashboard/docs/backup-recovery" 
                      className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Backup & Recovery</span>
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/dashboard/docs/performance" 
                      className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                    >
                      <Gauge className="h-4 w-4" />
                      <span>Performance Optimization</span>
                    </Link>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:bg-accent/5 transition-colors">
              <Link href="/dashboard/docs/vector-search">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Grid3X3 className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Vector Search Implementation</CardTitle>
                    <CardDescription>
                      Set up vector databases for semantic search
                    </CardDescription>
                  </div>
                  <div className="ml-auto">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Link>
            </Card>
            
            <Card className="hover:bg-accent/5 transition-colors">
              <Link href="/dashboard/docs/sql-editor">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Code className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>SQL Editor Tutorial</CardTitle>
                    <CardDescription>
                      Using the SQL Editor for database querying
                    </CardDescription>
                  </div>
                  <div className="ml-auto">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Link>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6">Additional Resources</h2>
          
          <Card className="hover:bg-accent/5 transition-colors">
            <Link href="/dashboard/docs/faq">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <CircleHelp className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Common questions and troubleshooting tips
                  </CardDescription>
                </div>
                <div className="ml-auto">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
            </Link>
          </Card>
        </section>
      </div>
    </ResponsiveContainer>
  )
} 