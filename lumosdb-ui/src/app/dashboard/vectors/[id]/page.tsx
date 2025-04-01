"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getVectorCollection, getVectorStats, getVectorsFromCollection } from "@/lib/api/vectors";
import { 
  ArrowLeft, Search, Database, FileText, BarChart3, Trash2, 
  Upload, Download, AlertCircle, ExternalLink, Settings
} from "lucide-react";
import Link from "next/link";

export default function CollectionDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const collectionId = Array.isArray(id) ? id[0] : id;
  
  const [collection, setCollection] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load collection data
  useEffect(() => {
    async function loadData() {
      if (!collectionId) {
        setError("Invalid collection ID");
        setIsLoading(false);
        return;
      }
      
      try {
        // Load collection details
        const collectionData = await getVectorCollection(collectionId);
        setCollection(collectionData);
        
        // Load collection stats
        const statsData = await getVectorStats(collectionId);
        setStats(statsData);
        
        // Load sample data
        const { data } = await getVectorsFromCollection(collectionId, { limit: 5, offset: 0 });
        setSamples(data);
        
        setError(null);
      } catch (err) {
        console.error("Failed to load collection data:", err);
        setError("Failed to load collection details");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [collectionId]);

  const handleDeleteCollection = () => {
    // In a real app, make API call to delete collection
    console.log("Deleting collection:", collectionId);
    setDeleteDialogOpen(false);
    
    // Navigate back to collections list
    router.push("/dashboard/vectors");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/vectors">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !collection) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/vectors">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Collections
          </Button>
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/vectors">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{collection?.name}</h2>
            <p className="text-muted-foreground">{collection?.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/vectors/${collectionId}/search`}>
            <Button>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </Link>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Vector Collection</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this collection? This action cannot be undone and will permanently delete all vector data in this collection.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteCollection}>Delete Collection</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-auto md:inline-flex grid-cols-3 h-auto md:h-10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Vectors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{collection?.count.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Dimensions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{collection?.dimensions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Embedding Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium truncate" title={collection?.model}>
                  {collection?.model}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Created</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">{collection?.created_at}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Collection Details</CardTitle>
              <CardDescription>Technical information about this vector collection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Index Type</p>
                    <p>{stats?.index_type || "None"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Distance Metric</p>
                    <p>{collection?.metadata.similarity}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Metadata Fields</p>
                    <div className="flex flex-wrap gap-1">
                      {stats?.metadata_fields?.map((field: string) => (
                        <Badge key={field} variant="secondary">{field}</Badge>
                      )) || <span className="text-muted-foreground">None</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Storage Size</p>
                    <p>~{Math.round(collection?.count * collection?.dimensions * 4 / (1024 * 1024))} MB (estimated)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sample Data</CardTitle>
              <CardDescription>Preview of vectors in this collection</CardDescription>
            </CardHeader>
            <CardContent>
              {samples.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Text</TableHead>
                      <TableHead>Metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {samples.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.id}</TableCell>
                        <TableCell>{item.text.length > 60 ? `${item.text.substring(0, 60)}...` : item.text}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(item.metadata).map(([key, value]) => (
                              <Badge key={key} variant="outline">
                                {key}: {String(value)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-4 text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Vectors
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vector Data</CardTitle>
              <CardDescription>Browse and manage vectors in this collection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min(5, collection?.count)} of {collection?.count} vectors
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Text</TableHead>
                      {samples.length > 0 && samples[0].metadata && Object.keys(samples[0].metadata).map(key => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {samples.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.id}</TableCell>
                        <TableCell>{item.text.length > 40 ? `${item.text.substring(0, 40)}...` : item.text}</TableCell>
                        {Object.keys(item.metadata || {}).map(key => (
                          <TableCell key={key}>
                            {typeof item.metadata[key] === 'number' 
                              ? item.metadata[key].toLocaleString() 
                              : String(item.metadata[key])}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="flex justify-center">
                  <Button variant="outline">Load More</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collection Settings</CardTitle>
              <CardDescription>Configure collection parameters and metadata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <div className="font-medium text-sm">Collection Name</div>
                  <p>{collection?.name}</p>
                </div>
                <div className="grid gap-2">
                  <div className="font-medium text-sm">Description</div>
                  <p>{collection?.description}</p>
                </div>
                <div className="grid gap-2">
                  <div className="font-medium text-sm">Dimensions</div>
                  <p>{collection?.dimensions}</p>
                </div>
                <div className="grid gap-2">
                  <div className="font-medium text-sm">Similarity Metric</div>
                  <p>{collection?.metadata.similarity}</p>
                </div>
                <div className="grid gap-2">
                  <div className="font-medium text-sm">Indexed</div>
                  <p>{collection?.metadata.indexed ? "Yes" : "No"}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Advanced Settings
              </Button>
              <Button variant="default">
                Save Changes
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Actions that cannot be undone</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <div className="font-medium">Delete Collection</div>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete this collection and all of its vectors. This action cannot be undone.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Collection
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 