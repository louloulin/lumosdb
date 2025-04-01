"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { getVectorCollection, searchVectors } from "@/lib/api/vectors";
import { ArrowLeft, Search, Filter, Download, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function CollectionSearchPage() {
  const { id } = useParams();
  const collectionId = Array.isArray(id) ? id[0] : id;
  
  const [collection, setCollection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState([0.5]); // Similarity threshold 0.0-1.0

  // Load collection data
  useEffect(() => {
    async function loadCollection() {
      if (!collectionId) {
        setError("Invalid collection ID");
        setIsLoading(false);
        return;
      }
      
      try {
        const data = await getVectorCollection(collectionId);
        setCollection(data);
        setError(null);
      } catch (err) {
        console.error("Failed to load collection:", err);
        setError("Failed to load collection details");
      } finally {
        setIsLoading(false);
      }
    }

    loadCollection();
  }, [collectionId]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim() || !collectionId) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const results = await searchVectors(collectionId, searchQuery, {
        limit: 10,
        filter: {}
      });
      
      // Filter by threshold
      const filteredResults = results.filter(
        item => parseFloat(item.score as string) >= threshold[0]
      );
      
      setSearchResults(filteredResults);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to perform vector search");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Get metadata fields from the first result
  const getMetadataFields = () => {
    if (searchResults.length === 0) return [];
    const firstResult = searchResults[0];
    return Object.keys(firstResult.metadata || {});
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
              <Skeleton className="h-10 w-full" />
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

      <Card>
        <CardHeader>
          <CardTitle>Vector Search</CardTitle>
          <CardDescription>
            Find similar items in the {collection?.name} collection using vector similarity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter your search query..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                <Search className="h-4 w-4 mr-2" />
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="border rounded-md p-4 space-y-2">
              <h3 className="text-sm font-medium mb-2">Search Settings</h3>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Similarity Threshold</span>
                  <span className="font-mono">{threshold[0].toFixed(2)}</span>
                </div>
                <Slider
                  defaultValue={[0.5]}
                  max={1}
                  min={0}
                  step={0.01}
                  value={threshold}
                  onValueChange={setThreshold}
                />
                <p className="text-xs text-muted-foreground">Only show results with similarity scores above this threshold</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm font-medium mb-1">Collection</p>
                  <p className="text-sm">{collection.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Dimensions</p>
                  <p className="text-sm">{collection.dimensions}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Model</p>
                  <p className="text-sm">{collection.model}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Distance Metric</p>
                  <p className="text-sm">{collection.metadata.similarity}</p>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <h3 className="text-sm font-medium mb-2">Search Results</h3>
              
              {isSearching ? (
                <div className="border rounded-md p-8 flex justify-center">
                  <p className="text-muted-foreground">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Text</TableHead>
                        {getMetadataFields().map(field => (
                          <TableHead key={field}>{field}</TableHead>
                        ))}
                        <TableHead className="text-right">Similarity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{result.text}</TableCell>
                          {getMetadataFields().map(field => (
                            <TableCell key={field}>
                              {typeof result.metadata[field] === 'number' 
                                ? result.metadata[field].toLocaleString() 
                                : String(result.metadata[field])}
                            </TableCell>
                          ))}
                          <TableCell className="text-right">
                            <Badge variant={
                              parseFloat(result.score) > 0.8 ? "default" : 
                              parseFloat(result.score) > 0.6 ? "secondary" : "outline"
                            }>
                              {parseFloat(result.score).toFixed(4)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : searchQuery ? (
                <div className="border rounded-md p-8 flex justify-center">
                  <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="border rounded-md p-8 flex justify-center">
                  <p className="text-muted-foreground">Enter a query and click Search to find similar items</p>
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="flex justify-end mt-4">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 