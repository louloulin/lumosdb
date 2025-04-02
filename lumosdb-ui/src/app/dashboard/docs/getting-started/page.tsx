"use client"

import Link from "next/link"
import { DocWrapper } from "@/components/doc-wrapper"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, ChevronLeft, ExternalLink, Terminal, Code, Database, LayoutDashboard } from "lucide-react"

export default function GettingStartedPage() {
  return (
    <DocWrapper>
      <div className="flex items-center mb-6">
        <Link href="/dashboard/docs">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to Documentation
          </Button>
        </Link>
        <div className="ml-auto flex gap-2">
          <Badge variant="outline">Beginner</Badge>
          <Badge variant="outline">Setup</Badge>
          <Badge variant="outline">Introduction</Badge>
        </div>
      </div>

      <div className="space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <BookOpen className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">Getting Started with LumosDB</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Learn the basics of LumosDB and set up your first database
          </p>
          <Separator className="my-6" />
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Introduction</h2>
          <p>
            LumosDB is a modern database management system that simplifies working with SQLite, DuckDB, 
            and vector databases. Whether you're a developer, data scientist, or database administrator, 
            LumosDB provides a unified interface to manage, query, and optimize your databases.
          </p>
          <p>
            With features like SQL Editor, Vector Search, Data Import/Export, and Backup & Recovery, 
            LumosDB helps you work efficiently with your data while ensuring it remains secure and accessible.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Multiple Database Support</h3>
                    <p className="text-sm text-muted-foreground">
                      Work with SQLite, DuckDB, and vector databases in a unified interface
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Code className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">SQL Editor</h3>
                    <p className="text-sm text-muted-foreground">
                      Write and execute SQL queries with syntax highlighting and autocomplete
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <LayoutDashboard className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Interactive Dashboard</h3>
                    <p className="text-sm text-muted-foreground">
                      Monitor and visualize database performance and metrics
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Assistant</h3>
                    <p className="text-sm text-muted-foreground">
                      Get assistance with queries, schema design, and optimization
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Installation</h2>
          <p>
            To get started with LumosDB, you can either use the hosted version or set up a local instance:
          </p>
          <h3 className="text-xl font-semibold mt-6">Option 1: Hosted Version</h3>
          <p>
            The easiest way to get started is to use our hosted version at{" "}
            <a href="https://lumosdb.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              lumosdb.com <ExternalLink className="inline h-3 w-3" />
            </a>. 
            Simply sign up for an account and you're ready to go.
          </p>
          <h3 className="text-xl font-semibold mt-6">Option 2: Local Installation</h3>
          <p>
            For local installation, you can use npm, pnpm, or Bun:
          </p>
          <div className="bg-muted p-4 rounded-md my-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                # Using npm
                {"\n"}npm install -g lumosdb
                {"\n"}
                {"\n"}# Using pnpm
                {"\n"}pnpm add -g lumosdb
                {"\n"}
                {"\n"}# Using Bun
                {"\n"}bun install -g lumosdb
              </code>
            </pre>
          </div>
          <p>
            After installation, start the LumosDB server:
          </p>
          <div className="bg-muted p-4 rounded-md my-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                lumosdb serve
              </code>
            </pre>
          </div>
          <p>
            The server will start at <code className="text-sm bg-muted px-1.5 py-0.5 rounded">http://localhost:3000</code>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Creating Your First Database</h2>
          <p>
            Let's create a simple SQLite database to get started:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to the Dashboard</span>
              <p className="text-muted-foreground ml-6 mt-1">
                After logging in, you'll be taken to the dashboard. Click on "SQLite" in the sidebar.
              </p>
            </li>
            <li>
              <span className="font-medium">Create a New Database</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click on the "Create New Database" button and enter a name for your database.
              </p>
            </li>
            <li>
              <span className="font-medium">Create Tables</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Use the SQL Editor to create tables. Here's a simple example:
              </p>
              <div className="bg-muted p-4 rounded-md my-2 ml-6 overflow-x-auto">
                <pre className="text-sm">
                  <code>
                    CREATE TABLE users (
                    {"\n"}  id INTEGER PRIMARY KEY,
                    {"\n"}  name TEXT NOT NULL,
                    {"\n"}  email TEXT UNIQUE,
                    {"\n"}  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    {"\n"});
                  </code>
                </pre>
              </div>
            </li>
            <li>
              <span className="font-medium">Insert Data</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Insert some sample data:
              </p>
              <div className="bg-muted p-4 rounded-md my-2 ml-6 overflow-x-auto">
                <pre className="text-sm">
                  <code>
                    INSERT INTO users (name, email) VALUES
                    {"\n"}('John Doe', 'john@example.com'),
                    {"\n"}('Jane Smith', 'jane@example.com');
                  </code>
                </pre>
              </div>
            </li>
            <li>
              <span className="font-medium">Query Data</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Run a simple query to verify your data:
              </p>
              <div className="bg-muted p-4 rounded-md my-2 ml-6 overflow-x-auto">
                <pre className="text-sm">
                  <code>
                    SELECT * FROM users;
                  </code>
                </pre>
              </div>
            </li>
          </ol>
          <p className="mt-4">
            Congratulations! You've created your first database with LumosDB. You can now explore more features
            like data visualization, backup/recovery, and more.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Next Steps</h2>
          <p>
            Now that you've created your first database, here are some next steps to explore:
          </p>
          <ul className="space-y-3 ml-4">
            <li className="flex gap-2">
              <ChevronLeft className="h-5 w-5 rotate-180 flex-shrink-0" />
              <span>
                <span className="font-medium block">Explore the SQL Editor</span>
                <span className="text-muted-foreground">Write complex queries and visualize results</span>
              </span>
            </li>
            <li className="flex gap-2">
              <ChevronLeft className="h-5 w-5 rotate-180 flex-shrink-0" />
              <span>
                <span className="font-medium block">Try Vector Search</span>
                <span className="text-muted-foreground">Upload embeddings and perform semantic searches</span>
              </span>
            </li>
            <li className="flex gap-2">
              <ChevronLeft className="h-5 w-5 rotate-180 flex-shrink-0" />
              <span>
                <span className="font-medium block">Set Up Automated Backups</span>
                <span className="text-muted-foreground">Ensure your data is protected with regular backups</span>
              </span>
            </li>
            <li className="flex gap-2">
              <ChevronLeft className="h-5 w-5 rotate-180 flex-shrink-0" />
              <span>
                <span className="font-medium block">Import External Data</span>
                <span className="text-muted-foreground">Import CSV, JSON, or SQL data into your database</span>
              </span>
            </li>
          </ul>
        </section>

        <Separator className="my-6" />

        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/docs">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Documentation
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/docs/sqlite-integration">
              Next: SQLite Database Management
              <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
            </Link>
          </Button>
        </div>
      </div>
    </DocWrapper>
  )
} 