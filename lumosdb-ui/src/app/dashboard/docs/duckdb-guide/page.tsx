"use client"

import Link from "next/link"
import { DocWrapper } from "@/components/doc-wrapper"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Database, 
  ChevronLeft, 
  BarChart, 
  FileSpreadsheet,
  Gauge,
  ArrowDownUp,
  Table,
  Lightbulb,
  LineChart,
  FileJson,
  FileType2,
  Info
} from "lucide-react"

export default function DuckDBGuidePage() {
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
          <Badge variant="outline">DuckDB</Badge>
          <Badge variant="outline">Analytics</Badge>
          <Badge variant="outline">Queries</Badge>
        </div>
      </div>

      <div className="space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Database className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">Working with DuckDB</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Learn how to use DuckDB for analytical queries and data processing in LumosDB
          </p>
          <Separator className="my-6" />
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Introduction to DuckDB</h2>
          <p>
            DuckDB is an analytical database management system designed for OLAP (Online Analytical 
            Processing) workloads. It's optimized for quick analytical queries over large datasets and 
            provides excellent performance for data analysis tasks.
          </p>
          <p>
            Key features of DuckDB include:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Column-oriented storage for efficient analytical queries</li>
            <li>Vectorized query execution</li>
            <li>Zero-copy data loading from various formats</li>
            <li>Built-in data visualization and complex analytics functions</li>
            <li>Seamless integration with modern data science tools</li>
          </ul>
          <p className="mt-4">
            LumosDB makes DuckDB even more accessible by providing a user-friendly interface, 
            visualization tools, and integration with other database types.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Getting Started with DuckDB</h2>
          
          <h3 className="text-xl font-semibold mt-6">Creating a DuckDB Database</h3>
          <p>
            To create a new DuckDB database in LumosDB:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to the DuckDB section</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click on "DuckDB" in the main navigation sidebar.
              </p>
            </li>
            <li>
              <span className="font-medium">Create a new database</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click the "New Analytics Database" button and provide a name.
              </p>
            </li>
            <li>
              <span className="font-medium">Configure memory settings</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Adjust memory allocation for optimal performance (optional).
              </p>
            </li>
          </ol>
          
          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Memory Configuration</AlertTitle>
            <AlertDescription>
              DuckDB is memory-oriented and will use available RAM for optimal performance. For large 
              datasets, adjust the memory settings in LumosDB to prevent out-of-memory errors.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Importing Data</h2>
          <p>
            DuckDB excels at loading data from various sources. LumosDB provides an intuitive interface 
            for these operations:
          </p>
          
          <Tabs defaultValue="csv" className="mt-6">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="csv">CSV/TSV</TabsTrigger>
              <TabsTrigger value="parquet">Parquet</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
              <TabsTrigger value="sql">SQL</TabsTrigger>
            </TabsList>
            
            <TabsContent value="csv" className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 mt-1">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold">Loading CSV/TSV Files</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Use the COPY statement or the built-in CSV reader:
                  </p>
                  <div className="bg-muted p-4 rounded-md overflow-x-auto">
                    <pre className="text-sm">
                      <code>
                        {`-- Copy from a CSV file
COPY sales FROM 'sales_data.csv' (DELIMITER ',', HEADER);

-- Query directly from CSV
SELECT * FROM read_csv_auto('sales_data.csv');

-- Load with custom options
SELECT * FROM read_csv('sales_data.csv', delim=',', header=true, columns={'date': 'DATE', 'amount': 'DOUBLE'});`}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="parquet" className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 mt-1">
                  <FileType2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold">Loading Parquet Files</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    DuckDB has excellent Parquet support with zero-copy reading:
                  </p>
                  <div className="bg-muted p-4 rounded-md overflow-x-auto">
                    <pre className="text-sm">
                      <code>
                        {`-- Query directly from Parquet
SELECT * FROM 'large_dataset.parquet';

-- Use read_parquet function
SELECT * FROM read_parquet('large_dataset.parquet');

-- Create a table from Parquet
CREATE TABLE sales AS SELECT * FROM 'large_dataset.parquet';`}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="json" className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 mt-1">
                  <FileJson className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold">Loading JSON Data</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Use the JSON functions to import structured data:
                  </p>
                  <div className="bg-muted p-4 rounded-md overflow-x-auto">
                    <pre className="text-sm">
                      <code>
                        {`-- Read JSON file
SELECT * FROM read_json_auto('data.json');

-- Read JSON with schema
SELECT * FROM read_json('data.json', 
  format='array', 
  columns={"id": "INTEGER", "name": "VARCHAR", "active": "BOOLEAN"});`}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="sql" className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 mt-1">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold">Importing from Other Databases</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    LumosDB can integrate DuckDB with other databases:
                  </p>
                  <div className="bg-muted p-4 rounded-md overflow-x-auto">
                    <pre className="text-sm">
                      <code>
                        -- Import from SQLite in LumosDB
                        CREATE TABLE analytics_data AS 
                          SELECT * FROM sqlite_scan('path/to/sqlite.db', 'table_name');

                        -- Import using CSV as intermediary
                        COPY (SELECT * FROM source_table) TO 'temp.csv';
                        COPY target_table FROM 'temp.csv' (HEADER);
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Analytical Queries</h2>
          <p>
            DuckDB shines with analytical queries. Here are some examples of powerful analytics you can perform:
          </p>
          
          <h3 className="text-xl font-semibold mt-6">Aggregation and Grouping</h3>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Basic aggregation
                SELECT 
                  category,
                  COUNT(*) as num_products,
                  SUM(sales) as total_sales,
                  AVG(price) as avg_price,
                  MIN(price) as min_price,
                  MAX(price) as max_price
                FROM products
                GROUP BY category
                ORDER BY total_sales DESC;
              </code>
            </pre>
          </div>
          
          <h3 className="text-xl font-semibold mt-6">Window Functions</h3>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Window functions for time-series analysis
                SELECT
                  date,
                  sales,
                  SUM(sales) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_7day_sales,
                  AVG(sales) OVER (PARTITION BY EXTRACT(month FROM date) ORDER BY date) as monthly_avg,
                  LAG(sales, 1, 0) OVER (ORDER BY date) as previous_day_sales,
                  (sales - LAG(sales, 1, sales) OVER (ORDER BY date)) / LAG(sales, 1, sales) OVER (ORDER BY date) * 100 as daily_pct_change
                FROM daily_sales
                ORDER BY date;
              </code>
            </pre>
          </div>
          
          <h3 className="text-xl font-semibold mt-6">Advanced Date Analysis</h3>
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Date and time manipulations
                SELECT
                  EXTRACT(YEAR FROM transaction_date) as year,
                  EXTRACT(MONTH FROM transaction_date) as month,
                  EXTRACT(DOW FROM transaction_date) as day_of_week,
                  CASE 
                    WHEN EXTRACT(DOW FROM transaction_date) IN (0, 6) THEN 'Weekend'
                    ELSE 'Weekday'
                  END as day_type,
                  SUM(amount) as total_amount
                FROM transactions
                GROUP BY year, month, day_of_week, day_type
                ORDER BY year, month, day_of_week;
              </code>
            </pre>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Advanced Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <BarChart className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Data Visualization</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      LumosDB provides integrated visualization tools for DuckDB queries, allowing you to create 
                      charts, graphs, and dashboards directly from your analytics results.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <ArrowDownUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Integration with Vector Search</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Combine DuckDB's analytical capabilities with vector search to analyze semantic data 
                      and perform complex operations on embeddings and vectors.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Gauge className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Performance Optimization</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      LumosDB automatically optimizes DuckDB for performance, but also provides manual controls 
                      for memory allocation, parallel processing, and other settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI-Assisted Analytics</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use the built-in AI assistant to help write complex queries, identify patterns in your 
                      data, and suggest optimizations for your analytics workflows.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Exporting Results</h2>
          <p>
            After running your analytical queries, you can export the results in various formats:
          </p>
          
          <div className="bg-muted p-4 rounded-md mt-4 overflow-x-auto">
            <pre className="text-sm">
              <code>
                -- Export to CSV
                COPY (SELECT * FROM analysis_results) TO 'results.csv' (HEADER);

                -- Export to Parquet (efficient for large results)
                COPY (SELECT * FROM analysis_results) TO 'results.parquet' (FORMAT PARQUET);

                -- Export to JSON
                COPY (SELECT * FROM analysis_results) TO 'results.json' (FORMAT JSON);
              </code>
            </pre>
          </div>
          
          <p className="mt-4">
            LumosDB simplifies this process with export buttons that let you download results 
            in your preferred format without writing COPY statements manually.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">DuckDB Integration with Data Science</h2>
          <p>
            For advanced users, LumosDB's DuckDB implementation can be integrated with data science 
            tools using the API. This enables:
          </p>
          
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Connection to Python notebooks and scripts</li>
            <li>Integration with R for statistical analysis</li>
            <li>Usage with popular data science frameworks</li>
            <li>Automated ETL pipelines</li>
          </ul>
          
          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              To use the LumosDB API with external tools, generate an API key in the Settings section 
              and use the provided connection examples for your language or framework of choice.
            </AlertDescription>
          </Alert>
        </section>

        <Separator className="my-6" />

        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/docs/sqlite-integration">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: SQLite Database Management
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/docs/vector-search">
              Next: Vector Search Implementation
              <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
            </Link>
          </Button>
        </div>
      </div>
    </DocWrapper>
  )
} 