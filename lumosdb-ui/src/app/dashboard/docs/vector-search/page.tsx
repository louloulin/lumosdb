"use client"

import Link from "next/link"
import { DocWrapper } from "@/components/doc-wrapper"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Database, 
  ChevronLeft, 
  Search, 
  Code,
  Layers,
  Grid3X3,
  ArrowUpDown,
  AlertTriangle,
  FileCode,
  BarChart4
} from "lucide-react"

export default function VectorSearchPage() {
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
          <Badge variant="outline">Vector</Badge>
          <Badge variant="outline">Embedding</Badge>
          <Badge variant="outline">Similarity</Badge>
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
            Learn how to use vector databases for semantic search and similarity matching in LumosDB
          </p>
          <Separator className="my-6" />
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Introduction to Vector Databases</h2>
          <p>
            Vector databases store data as high-dimensional vectors (embeddings) and allow for 
            similarity-based searches. Unlike traditional databases that match exact values, vector 
            databases find the most similar items based on the distance between vectors in the embedding space.
          </p>
          <p>
            Key use cases for vector databases include:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Semantic search (finding content with similar meaning)</li>
            <li>Recommendation systems</li>
            <li>Image and audio similarity</li>
            <li>Natural language processing applications</li>
            <li>Anomaly detection</li>
          </ul>
          <p className="mt-4">
            LumosDB integrates vector database capabilities with traditional SQL databases, 
            providing a unified interface for all your data needs.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Creating Vector Collections</h2>
          
          <p>
            In LumosDB, vector data is organized into collections. To create a new vector collection:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to the Vector DB section</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click on "Vector DB" in the main navigation sidebar.
              </p>
            </li>
            <li>
              <span className="font-medium">Create a new collection</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click the "New Collection" button and provide a name.
              </p>
            </li>
            <li>
              <span className="font-medium">Configure vector parameters</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Set the vector dimension, similarity metric, and indexing options.
              </p>
            </li>
          </ol>
          
          <Card className="mt-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-3">Key Configuration Options</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <Layers className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="font-medium">Vector Dimension</span>
                    <p className="text-sm text-muted-foreground">
                      The size of your embedding vectors (e.g., 768 for BERT, 1536 for OpenAI embeddings).
                      This must match the dimension of the vectors you plan to store.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="font-medium">Distance Metric</span>
                    <p className="text-sm text-muted-foreground">
                      Choose between Cosine, Euclidean, or Dot Product based on your use case.
                      Cosine is often best for text embeddings, while Euclidean works well for image embeddings.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <Search className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="font-medium">Index Type</span>
                    <p className="text-sm text-muted-foreground">
                      Select HNSW (Hierarchical Navigable Small World) for faster queries 
                      or Flat for exact but slower searches.
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
          
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Once you create a collection with a specific dimension, you cannot change it later.
              Make sure to select the correct dimension for your embedding model.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Adding Vector Data</h2>
          
          <p>
            After creating a collection, you can add vector data in several ways:
          </p>
          
          <Tabs defaultValue="ui" className="mt-6">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="ui">User Interface</TabsTrigger>
              <TabsTrigger value="api">API</TabsTrigger>
              <TabsTrigger value="import">Bulk Import</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ui" className="space-y-4">
              <p>
                To add vectors through the UI:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Open your collection from the Vector DB section</li>
                <li>Click "Add Vector" button</li>
                <li>Enter or paste your vector data (as JSON array or comma-separated values)</li>
                <li>Add metadata if needed (as JSON object)</li>
                <li>Click "Save"</li>
              </ol>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Ensure your vector dimension matches the collection's configuration.
                </AlertDescription>
              </Alert>
            </TabsContent>
            
            <TabsContent value="api" className="space-y-4">
              <p>
                Add vectors programmatically using the LumosDB API:
              </p>
              <div className="bg-muted p-4 rounded-md overflow-x-auto">
                <pre className="text-sm">
                  <code>
                    {`// JavaScript example
const response = await fetch('/api/vector/collections/my_collection/vectors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    vector: [0.1, 0.2, 0.3], // Your vector values
    metadata: {
      title: 'Example document',
      category: 'documentation'
    }
  })
});`}
                  </code>
                </pre>
              </div>
              <p className="mt-2">
                Each vector requires:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <span className="font-medium">vector</span>: Array of floating-point numbers matching your collection's dimension
                </li>
                <li>
                  <span className="font-medium">metadata</span> (optional): JSON object with additional information to store with the vector
                </li>
              </ul>
            </TabsContent>
            
            <TabsContent value="import" className="space-y-4">
              <p>
                For large datasets, use the bulk import feature:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Prepare a JSONL file with one vector per line</li>
                <li>Go to your collection and click "Import"</li>
                <li>Upload your file or provide a URL</li>
                <li>Configure import settings</li>
                <li>Start the import process</li>
              </ol>
              <p className="mt-2">Example JSONL format:</p>
              <div className="bg-muted p-4 rounded-md overflow-x-auto">
                <pre className="text-sm">
                  <code>
                    {`[
  {
    "vector": [0.1, 0.2, 0.3], 
    "metadata": {"title": "Document 1"}
  },
  {
    "vector": [0.2, 0.3, 0.4], 
    "metadata": {"title": "Document 2"}
  },
  {
    "vector": [0.3, 0.4, 0.5], 
    "metadata": {"title": "Document 3"}
  }
]`}
                  </code>
                </pre>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Bulk Import Tips</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Monitor import progress in the "Tasks" section</li>
                    <li>For very large imports, consider using the chunked API</li>
                    <li>All vectors must have the same dimension as the collection</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Searching Vector Collections</h2>
          
          <p>
            Once you have added vectors to your collection, you can perform similarity searches:
          </p>
          
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to your collection</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Open the Vector DB section and select your collection.
              </p>
            </li>
            <li>
              <span className="font-medium">Go to the Search tab</span>
              <p className="text-muted-foreground ml-6 mt-1">
                You'll see options for both vector search and metadata filtering.
              </p>
            </li>
            <li>
              <span className="font-medium">Enter your query vector</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Either paste a vector directly or use the text-to-vector feature to generate embeddings from text.
              </p>
            </li>
            <li>
              <span className="font-medium">Set search parameters</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Configure the number of results (k), distance threshold, and any metadata filters.
              </p>
            </li>
            <li>
              <span className="font-medium">Run the search</span>
              <p className="text-muted-foreground ml-6 mt-1">
                View results sorted by similarity score, with distance metrics and metadata displayed.
              </p>
            </li>
          </ol>
          
          <Card className="mt-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-3">Advanced Search Options</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-2">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <Search className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="font-medium">Metadata Filtering</span>
                    <p className="text-sm text-muted-foreground">
                      Filter results based on metadata values. For example, search only within a specific category:
                    </p>
                    <div className="bg-muted p-2 rounded-md mt-1 overflow-x-auto">
                      <pre className="text-sm">
                        <code>
                          {`{
  "field": "category", 
  "operator": "=", 
  "value": "documentation"
}`}
                        </code>
                      </pre>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="font-medium">Distance Threshold</span>
                    <p className="text-sm text-muted-foreground">
                      Set a maximum distance threshold to only return results below a certain distance.
                      Useful for ensuring only truly similar items are returned.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <BarChart4 className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="font-medium">Hybrid Search</span>
                    <p className="text-sm text-muted-foreground">
                      Combine vector similarity with metadata filtering for more precise results.
                      For example, find the most similar articles within a specific date range.
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
          
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Search Performance Tip</AlertTitle>
            <AlertDescription>
              To optimize search performance, use metadata filters to narrow the search space before 
              performing vector similarity calculations. This can dramatically improve search times 
              on large collections.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Application Integration</h2>
          
          <p>
            Integrate vector search into your applications using the LumosDB API:
          </p>
          
          <div className="bg-muted p-4 rounded-md overflow-x-auto mt-4">
            <pre className="text-sm">
              <code>
                {`// JavaScript example - Vector search with metadata filter
const response = await fetch('/api/vector/collections/my_collection/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    vector: [0.1, 0.2, 0.3], // Query vector
    k: 10, // Number of results to return
    filter: {
      field: 'category',
      operator: '=',
      value: 'documentation'
    }
  })
});

const results = await response.json();
// Results format:

// [
//   {
//     id: '1234',
//     vector: [...],
//     metadata: { ... },
//     distance: 0.123 // Similarity score
//   },
//   ...
// ]`}
              </code>
            </pre>
          </div>
          
          <Alert className="mt-6">
            <FileCode className="h-4 w-4" />
            <AlertTitle>API Documentation</AlertTitle>
            <AlertDescription>
              For a complete reference of the LumosDB Vector API, including all available endpoints 
              and parameters, visit the API documentation section.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Best Practices</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold">Optimizing Vector Dimensions</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose the appropriate dimension for your use case. Higher dimensions capture more 
                  information but require more storage and processing time. For many text applications, 
                  768-1536 dimensions are sufficient.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold">Choosing the Right Distance Metric</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  • Cosine similarity: Best for text embeddings where direction matters more than magnitude
                  <br />
                  • Euclidean distance: Good for image embeddings where absolute distance matters
                  <br />
                  • Dot product: Useful when vectors are already normalized
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold">Effective Metadata Strategy</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Store relevant metadata with your vectors to enable filtering and provide context. 
                  Common metadata fields include document source, timestamp, categories, and keywords.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold">Performance Considerations</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  • Use HNSW index for large collections (&gt;100K vectors)
                  <br />
                  • Apply metadata filters first to reduce the search space
                  <br />
                  • Consider chunking large documents before embedding
                  <br />
                  • Monitor and adjust your k value based on result quality
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="my-6" />

        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/docs/duckdb-guide">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: DuckDB Guide
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/docs/backup-recovery">
              Next: Backup & Recovery
              <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
            </Link>
          </Button>
        </div>
      </div>
    </DocWrapper>
  )
} 