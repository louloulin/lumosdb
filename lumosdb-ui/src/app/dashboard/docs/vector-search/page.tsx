"use client"

import Link from "next/link"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Grid3X3, 
  ChevronLeft, 
  Code, 
  Search,
  Brain,
  BarChart,
  Lightbulb,
  Boxes,
  Info
} from "lucide-react"

export default function VectorSearchPage() {
  return (
    <ResponsiveContainer className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/docs">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to Documentation
          </Button>
        </Link>
        <div className="ml-auto flex gap-2">
          <Badge variant="outline">Vector</Badge>
          <Badge variant="outline">Semantic Search</Badge>
          <Badge variant="outline">Embeddings</Badge>
        </div>
      </div>

      <div className="space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Grid3X3 className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">Vector Search Implementation</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            How to set up and use vector databases for semantic search in LumosDB
          </p>
          <Separator className="my-6" />
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Introduction to Vector Search</h2>
          <p>
            Vector search is a technique for finding similar items in large datasets based on their 
            semantic meaning rather than exact keyword matches. It involves converting text, images, 
            or other data into numerical vectors (embeddings) and then finding vectors that are 
            close to each other in a high-dimensional space.
          </p>
          <p>
            LumosDB provides built-in support for vector databases, allowing you to:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Create and manage vector collections</li>
            <li>Import and generate embeddings from various data sources</li>
            <li>Perform similarity searches</li>
            <li>Enhance search results with metadata filtering</li>
            <li>Build powerful AI applications with semantic search capabilities</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Getting Started with Vector Search</h2>
          
          <h3 className="text-xl font-semibold mt-6">Creating a Vector Collection</h3>
          <p>
            To create a new vector collection in LumosDB:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to the Vector section</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click on &quot;Vector Data&quot; in the main navigation sidebar.
              </p>
            </li>
            <li>
              <span className="font-medium">Create a new collection</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click the &quot;New Collection&quot; button and provide a name.
              </p>
            </li>
            <li>
              <span className="font-medium">Configure collection settings</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Set the vector dimension (e.g., 768, 1024, 1536), distance metric (e.g., cosine, 
                euclidean), and other parameters.
              </p>
            </li>
          </ol>
          
          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Vector Dimensions</AlertTitle>
            <AlertDescription>
              The dimension of your vectors depends on the embedding model you use. Common dimensions are:
              <ul className="list-disc list-inside mt-2">
                <li>OpenAI text-embedding-3-small: 1536 dimensions</li>
                <li>OpenAI text-embedding-ada-002: 1536 dimensions</li>
                <li>BERT base: 768 dimensions</li>
                <li>SBERT: 384 or 768 dimensions</li>
              </ul>
              Ensure your collection dimension matches your embedding model.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Adding Vector Data</h2>
          
          <h3 className="text-xl font-semibold mt-6">Option 1: Upload Pre-computed Embeddings</h3>
          <p>
            If you already have vector embeddings, you can import them directly:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Click &quot;Import Vectors&quot; on your collection page</li>
            <li>Select the file format (JSON, CSV, or Parquet)</li>
            <li>Upload your file containing vector data and metadata</li>
            <li>Map the columns to vector fields and metadata fields</li>
            <li>Start the import process</li>
          </ol>
          
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                {`// Example JSON format for vector import
[
  {
    "id": "doc1",
    "vector": [0.1, 0.2, 0.3, ...],  // Vector values
    "metadata": {
      "text": "Sample document text",
      "category": "example",
      "date": "2023-12-05"
    }
  },
  ...
]`}
              </code>
            </pre>
          </div>
          
          <h3 className="text-xl font-semibold mt-6">Option 2: Generate Embeddings in LumosDB</h3>
          <p>
            LumosDB can generate embeddings from your raw text data:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Click &quot;Generate Embeddings&quot; on your collection page</li>
            <li>Select your data source (text file, database, or paste text)</li>
            <li>Choose an embedding model (e.g., OpenAI, BERT, etc.)</li>
            <li>Configure chunking and preprocessing options</li>
            <li>Start the embedding generation process</li>
          </ol>
          
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold">Selecting an Embedding Model</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    LumosDB supports multiple embedding models:
                  </p>
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead>Dimensions</TableHead>
                        <TableHead>Best For</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>OpenAI text-embedding-3-small</TableCell>
                        <TableCell>1536</TableCell>
                        <TableCell>General purpose, high quality</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>OpenAI text-embedding-ada-002</TableCell>
                        <TableCell>1536</TableCell>
                        <TableCell>Legacy, still good quality</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sentence-BERT</TableCell>
                        <TableCell>768</TableCell>
                        <TableCell>Offline use, no API costs</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>CLIP</TableCell>
                        <TableCell>512</TableCell>
                        <TableCell>Image embedding</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Performing Vector Searches</h2>
          
          <h3 className="text-xl font-semibold mt-6">Basic Similarity Search</h3>
          <p>
            To search for similar vectors:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Go to your collection&apos;s &quot;Search&quot; tab</li>
            <li>Enter a query text or upload a vector directly</li>
            <li>Set the number of results to return (k)</li>
            <li>Click &quot;Search&quot;</li>
          </ol>
          
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                {`// Example search API request
POST /api/vectors/collections/my_collection/search
{
  "query": "What is machine learning?",
  "top_k": 5,
  "include_metadata": true
}`}
              </code>
            </pre>
          </div>
          
          <h3 className="text-xl font-semibold mt-6">Advanced Search Features</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Search className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Metadata Filtering</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Filter results based on metadata fields to narrow search results:
                    </p>
                    <div className="bg-muted p-2 rounded-md mt-2 overflow-x-auto">
                      <pre className="text-xs">
                        <code>
                          {`{
  "query": "neural networks",
  "filter": {
    "category": "AI",
    "date": { "$gte": "2022-01-01" }
  }
}`}
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <BarChart className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Hybrid Search</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Combine vector similarity with keyword search for better results:
                    </p>
                    <div className="bg-muted p-2 rounded-md mt-2 overflow-x-auto">
                      <pre className="text-xs">
                        <code>
                          {`{
  "query": "machine learning algorithms",
  "hybrid": {
    "keywords": "neural networks",
    "weight": 0.3
  }
}`}
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Building Applications with Vector Search</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Semantic Search Engine</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create a search engine that understands the meaning behind queries rather than 
                      just matching keywords, significantly improving search relevance.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">RAG with LLMs</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Implement Retrieval-Augmented Generation by combining vector search with Large 
                      Language Models to provide accurate, knowledge-grounded responses.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Boxes className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Recommendation Systems</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Build content or product recommendation systems that suggest items based on 
                      semantic similarity instead of just collaborative filtering.
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
                    <h3 className="font-semibold">Code Search</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Implement semantic code search that understands programming concepts and can find 
                      relevant code snippets even when the query uses different terminology.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Integrating with Your Application</h2>
          <p>
            LumosDB provides simple APIs to integrate vector search into your applications:
          </p>
          
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                {`// JavaScript/TypeScript example
import { LumosDBClient } from '@lumosdb/client';

const client = new LumosDBClient({
  apiKey: 'your_api_key',
  serverUrl: 'http://your-lumosdb-instance'
});

// Search for similar vectors
async function searchSimilarDocuments(query) {
  const results = await client.vectors.search({
    collectionName: 'documents',
    query: query,
    topK: 5,
    includeMetadata: true
  });
  
  return results;
}

// Add new vectors
async function addDocument(text, metadata) {
  const result = await client.vectors.add({
    collectionName: 'documents',
    texts: [text],
    metadata: [metadata]
  });
  
  return result;
}`}
              </code>
            </pre>
          </div>
          
          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>API Documentation</AlertTitle>
            <AlertDescription>
              For full API documentation, visit the API Reference section or access the Swagger UI at 
              <code className="ml-1 bg-muted px-1 py-0.5 rounded">/api/docs</code> endpoint on your LumosDB instance.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Performance Optimization</h2>
          <p>
            To get the best performance from your vector database:
          </p>
          
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <span className="font-medium">Index Configuration</span>: Use HNSW or IVF indexes for large collections
            </li>
            <li>
              <span className="font-medium">Vector Dimension</span>: Lower dimensions are faster to query
            </li>
            <li>
              <span className="font-medium">Batch Operations</span>: Use batch insert/update/delete for better throughput
            </li>
            <li>
              <span className="font-medium">Filtering</span>: Apply metadata filters to reduce the search space
            </li>
            <li>
              <span className="font-medium">Hardware</span>: Allocate more RAM for larger collections
            </li>
          </ul>
          
          <p className="mt-4">
            LumosDB provides monitoring tools to help you identify and fix performance bottlenecks in your 
            vector search operations.
          </p>
        </section>

        <Separator className="my-6" />

        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/docs/duckdb-guide">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: Working with DuckDB
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/docs/sql-editor">
              Next: SQL Editor Tutorial
              <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
            </Link>
          </Button>
        </div>
      </div>
    </ResponsiveContainer>
  )
} 