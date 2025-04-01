"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Plus, Database, FileText, Search, ArrowUpRight, Filter, Trash2 } from "lucide-react";
import { getVectorCollections } from "@/lib/api/vectors";
import Link from "next/link";

interface CollectionStats {
  collection: string;
  vectors: number;
  dimensions: number;
  model: string;
  updated: string;
}

export default function VectorsPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("collections");

  useEffect(() => {
    async function loadCollections() {
      try {
        const data = await getVectorCollections();
        setCollections(data);
      } catch (err) {
        console.error("Failed to load vector collections:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCollections();
  }, []);

  // Filter collections based on search term
  const filteredCollections = collections.filter(
    (collection) =>
      collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vector Search</h2>
          <p className="text-muted-foreground">
            Manage vector collections and perform similarity searches
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Collection
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create a new vector collection</DialogTitle>
                <DialogDescription>
                  Define a new collection to store and query vector embeddings.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium">
                    Name
                  </label>
                  <Input id="name" className="col-span-3" placeholder="Product Embeddings" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="description" className="text-right text-sm font-medium">
                    Description
                  </label>
                  <Input id="description" className="col-span-3" placeholder="Vector embeddings for product descriptions" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="dimensions" className="text-right text-sm font-medium">
                    Dimensions
                  </label>
                  <Input id="dimensions" className="col-span-3" type="number" placeholder="1536" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="model" className="text-right text-sm font-medium">
                    Model
                  </label>
                  <Input id="model" className="col-span-3" placeholder="text-embedding-3-large" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Collection</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      <div className="flex w-full max-w-sm items-center space-x-2 mb-4">
        <Input
          placeholder="Search collections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button type="submit" onClick={() => setSearchTerm("")} variant="outline">
          Clear
        </Button>
      </div>

      <Tabs defaultValue="collections" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="recent">Recent Searches</TabsTrigger>
          <TabsTrigger value="stats">Usage Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="collections" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-3 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-8 w-24" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {filteredCollections.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center h-40 gap-2">
                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">No collections found.</p>
                    <Button variant="outline" onClick={() => setSearchTerm("")}>
                      Clear search
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCollections.map((collection) => (
                    <Card key={collection.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{collection.name}</CardTitle>
                            <CardDescription>{collection.description}</CardDescription>
                          </div>
                          <Badge variant="outline">{collection.count.toLocaleString()} vectors</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dimensions:</span>
                            <span className="font-medium">{collection.dimensions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Model:</span>
                            <span className="font-medium">{collection.model}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Distance:</span>
                            <span className="font-medium">{collection.metadata.similarity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Created:</span>
                            <span className="font-medium">{collection.created_at}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between border-t p-3 bg-muted/30">
                        <Link href={`/dashboard/vectors/${collection.id}`}>
                          <Button variant="ghost" size="sm" className="h-8">
                            <Database className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </Link>
                        <Link href={`/dashboard/vectors/${collection.id}/search`}>
                          <Button size="sm" className="h-8">
                            <Search className="h-4 w-4 mr-1" />
                            Search
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Vector Searches</CardTitle>
              <CardDescription>History of your recent vector similarity searches</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Results</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Ergonomic office chair</TableCell>
                    <TableCell>Product Embeddings</TableCell>
                    <TableCell>2024-04-01</TableCell>
                    <TableCell className="text-right">8</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Wireless headphones with ANC</TableCell>
                    <TableCell>Product Embeddings</TableCell>
                    <TableCell>2024-04-01</TableCell>
                    <TableCell className="text-right">12</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Tech enthusiast preferences</TableCell>
                    <TableCell>Customer Profiles</TableCell>
                    <TableCell>2024-03-30</TableCell>
                    <TableCell className="text-right">5</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vector Database Usage Statistics</CardTitle>
              <CardDescription>Overview of vector collection usage and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Collections Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{collections.length}</div>
                          <p className="text-xs text-muted-foreground">Total Collections</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {collections.reduce((total, c) => total + c.count, 0).toLocaleString()}
                          </div>
                          <p className="text-xs text-muted-foreground">Total Vectors</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">348</div>
                          <p className="text-xs text-muted-foreground">Searches This Month</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Top Collections by Usage</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Collection</TableHead>
                        <TableHead>Vectors</TableHead>
                        <TableHead>Dimensions</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Searches</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collections.slice(0, 5).map((collection) => (
                        <TableRow key={collection.id}>
                          <TableCell className="font-medium">{collection.name}</TableCell>
                          <TableCell>{collection.count.toLocaleString()}</TableCell>
                          <TableCell>{collection.dimensions}</TableCell>
                          <TableCell>{collection.model}</TableCell>
                          <TableCell className="text-right">{Math.floor(Math.random() * 200) + 50}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 