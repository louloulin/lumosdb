// Real DuckDB API integration using DuckDB service
import {
  executeDuckDBQuery,
  getDuckDBDatasets,
  getDuckDBDatasetSample
} from './duckdb-service';

// Example analytics queries structure remains the same for UI compatibility
export const analyticsQueries = [
  {
    id: 1,
    name: "Sales by Region",
    description: "Aggregated sales data by geographic region",
    query: "SELECT region, SUM(amount) as total_sales, COUNT(*) as orders, AVG(amount) as avg_order FROM sales GROUP BY region ORDER BY total_sales DESC",
    visualization: "bar",
    resultTable: "sales_by_region", // Reference to the table in database
    createdAt: "2023-11-15"
  },
  {
    id: 2,
    name: "Product Category Performance",
    description: "Revenue and profit analysis by product category",
    query: "SELECT category as product_category, SUM(revenue) as revenue, SUM(profit) as profit, AVG(profit/revenue) as margin FROM products GROUP BY category ORDER BY revenue DESC",
    visualization: "bar",
    resultTable: "product_performance",
    createdAt: "2023-12-02"
  },
  {
    id: 3,
    name: "Customer Segmentation",
    description: "Analysis of customer segments by revenue and retention",
    query: "SELECT segment, COUNT(*) as count, SUM(lifetime_value) as revenue, AVG(retention_score) as retention_rate FROM customers GROUP BY segment ORDER BY revenue DESC",
    visualization: "pie",
    resultTable: "customer_segments",
    createdAt: "2024-01-10"
  },
  {
    id: 4,
    name: "Monthly Revenue Trend",
    description: "Time series analysis of revenue by month",
    query: "SELECT DATE_TRUNC('month', order_date) as date, SUM(amount) as revenue, COUNT(*) as orders FROM sales GROUP BY date ORDER BY date",
    visualization: "line",
    resultTable: "time_series",
    createdAt: "2024-02-05"
  }
];

// Type definitions for analytics data
export interface AnalyticsData {
  [key: string]: string | number | boolean | null | undefined;
}

// Get all available analytics tables
export async function getAnalyticsTables(): Promise<string[]> {
  try {
    // Get datasets from the real API
    const datasets = await getDuckDBDatasets();
    // Extract and return dataset names
    return datasets.map(dataset => dataset.name);
  } catch (error) {
    console.error("Error fetching analytics tables:", error);
    return [];
  }
}

// Execute an analytic query
export async function executeAnalyticsQuery(
  query: string
): Promise<{ data: AnalyticsData[] | null; error: string | null; duration: number }> {
  try {
    // Use the real API to execute the query
    const result = await executeDuckDBQuery(query);
    // Convert the result to match the expected AnalyticsData type
    return {
      data: result.data as AnalyticsData[],
      error: result.error,
      duration: result.duration
    };
  } catch (error) {
    return {
      data: null,
      error: `Error executing analytics query: ${error instanceof Error ? error.message : String(error)}`,
      duration: 0
    };
  }
}

// Get a specific saved analytics query
export function getAnalyticsQuery(id: number): Promise<typeof analyticsQueries[0]> {
  return new Promise((resolve, reject) => {
    const query = analyticsQueries.find(q => q.id === id);
    if (query) {
      resolve(query);
    } else {
      reject(new Error(`Analytics query with ID ${id} not found`));
    }
  });
}

// Get results for a specific predefined analysis
export async function getAnalyticsResults(tableName: string): Promise<AnalyticsData[] | null> {
  try {
    // First, get all datasets to find the one matching the tableName
    const datasets = await getDuckDBDatasets();
    const dataset = datasets.find(d => d.name.toLowerCase() === tableName.toLowerCase());
    
    if (!dataset) {
      console.warn(`Dataset '${tableName}' not found, falling back to mock data`);
      
      // For backward compatibility, if no matching dataset is found
      // Return a mock result based on the query name
      if (tableName === 'sales_by_region') {
        return [
          { region: "North America", total_sales: 1245000, orders: 3200, avg_order: 389.06 },
          { region: "Europe", total_sales: 945000, orders: 2800, avg_order: 337.50 },
          { region: "Asia Pacific", total_sales: 1570000, orders: 4100, avg_order: 382.93 },
          { region: "Latin America", total_sales: 485000, orders: 1500, avg_order: 323.33 },
          { region: "Africa", total_sales: 225000, orders: 780, avg_order: 288.46 },
        ];
      } else if (tableName === 'product_performance') {
        return [
          { product_category: "Electronics", revenue: 2450000, profit: 735000, margin: 0.30 },
          { product_category: "Clothing", revenue: 1250000, profit: 437500, margin: 0.35 },
          { product_category: "Home Goods", revenue: 985000, profit: 295500, margin: 0.30 },
          { product_category: "Sports", revenue: 675000, profit: 236250, margin: 0.35 },
          { product_category: "Books", revenue: 345000, profit: 103500, margin: 0.30 },
        ];
      } else if (tableName === 'customer_segments') {
        return [
          { segment: "New Customers", count: 12500, revenue: 875000, retention_rate: 0.25 },
          { segment: "Occasional", count: 28500, revenue: 1425000, retention_rate: 0.45 },
          { segment: "Regular", count: 15750, revenue: 2362500, retention_rate: 0.75 },
          { segment: "Loyal", count: 8250, revenue: 2062500, retention_rate: 0.95 },
        ];
      } else if (tableName === 'time_series') {
        return [
          { date: "2023-01", revenue: 375000, orders: 1250 },
          { date: "2023-02", revenue: 390000, orders: 1300 },
          { date: "2023-03", revenue: 415000, orders: 1350 },
          { date: "2023-04", revenue: 430000, orders: 1400 },
          { date: "2023-05", revenue: 450000, orders: 1450 },
          { date: "2023-06", revenue: 480000, orders: 1500 },
          { date: "2023-07", revenue: 510000, orders: 1550 },
          { date: "2023-08", revenue: 525000, orders: 1600 },
          { date: "2023-09", revenue: 540000, orders: 1650 },
          { date: "2023-10", revenue: 560000, orders: 1700 },
          { date: "2023-11", revenue: 590000, orders: 1750 },
          { date: "2023-12", revenue: 650000, orders: 1850 },
        ];
      }
      return null;
    }
    
    // Get a sample of the dataset
    const result = await getDuckDBDatasetSample(dataset.id, 100);
    
    // Convert the sample data to the expected format
    if (result && result.columns && result.rows) {
      return result.rows.map(row => {
        const obj: Record<string, unknown> = {};
        for (let i = 0; i < result.columns.length; i++) {
          obj[result.columns[i]] = row[i];
        }
        return obj as unknown as AnalyticsData;
      });
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching analytics results:", error);
    return null;
  }
} 