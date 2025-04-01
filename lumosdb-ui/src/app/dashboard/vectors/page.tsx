import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, BarChart4, Fingerprint, Tag } from "lucide-react";

export default function VectorsPage() {
  // Sample data for demonstration
  const collections = [
    { 
      name: "product_embeddings", 
      vectors: 2500, 
      dimensions: 1536,
      model: "text-embedding-3-large",
      created: "2023-11-15"
    },
    { 
      name: "customer_profiles", 
      vectors: 1200, 
      dimensions: 768,
      model: "text-embedding-ada-002",
      created: "2023-12-02"
    },
    { 
      name: "image_features", 
      vectors: 5600, 
      dimensions: 1024,
      model: "clip-ViT-B-32",
      created: "2024-01-28"
    },
    { 
      name: "sentiment_vectors", 
      vectors: 850, 
      dimensions: 384,
      model: "all-MiniLM-L6-v2",
      created: "2024-02-15"
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vector Collections</h2>
          <p className="text-muted-foreground">
            Manage your AI-powered vector embeddings for semantic search.
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Collection
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Vectors
            </CardTitle>
            <Fingerprint className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10,150</div>
            <p className="text-xs text-muted-foreground">
              Across all collections
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Collections
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">
              Vector collections
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Dimensions
            </CardTitle>
            <BarChart4 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">928</div>
            <p className="text-xs text-muted-foreground">
              Average vector size
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Vector Collections</CardTitle>
              <CardDescription>
                Browse and manage your vector collections
              </CardDescription>
            </div>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input 
                type="search" 
                placeholder="Search collections..."
                className="max-w-[250px]"
              />
              <Button type="submit" size="icon" variant="ghost">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Vectors</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((collection) => (
                <TableRow key={collection.name}>
                  <TableCell className="font-medium">{collection.name}</TableCell>
                  <TableCell>{collection.vectors.toLocaleString()}</TableCell>
                  <TableCell>{collection.dimensions}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-600/20">
                      {collection.model}
                    </span>
                  </TableCell>
                  <TableCell>{collection.created}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Search</Button>
                    <Button variant="ghost" size="sm">Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 