// Mock analytics data for DuckDB
const mockAnalyticTables = {
  sales_by_region: [
    { region: "North America", total_sales: 1245000, orders: 3200, avg_order: 389.06 },
    { region: "Europe", total_sales: 945000, orders: 2800, avg_order: 337.50 },
    { region: "Asia Pacific", total_sales: 1570000, orders: 4100, avg_order: 382.93 },
    { region: "Latin America", total_sales: 485000, orders: 1500, avg_order: 323.33 },
    { region: "Africa", total_sales: 225000, orders: 780, avg_order: 288.46 },
  ],
  product_performance: [
    { product_category: "Electronics", revenue: 2450000, profit: 735000, margin: 0.30 },
    { product_category: "Clothing", revenue: 1250000, profit: 437500, margin: 0.35 },
    { product_category: "Home Goods", revenue: 985000, profit: 295500, margin: 0.30 },
    { product_category: "Sports", revenue: 675000, profit: 236250, margin: 0.35 },
    { product_category: "Books", revenue: 345000, profit: 103500, margin: 0.30 },
  ],
  customer_segments: [
    { segment: "New Customers", count: 12500, revenue: 875000, retention_rate: 0.25 },
    { segment: "Occasional", count: 28500, revenue: 1425000, retention_rate: 0.45 },
    { segment: "Regular", count: 15750, revenue: 2362500, retention_rate: 0.75 },
    { segment: "Loyal", count: 8250, revenue: 2062500, retention_rate: 0.95 },
  ],
  time_series: [
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
  ],
};

// Example analytics queries
export const analyticsQueries = [
  {
    id: 1,
    name: "Sales by Region",
    description: "Aggregated sales data by geographic region",
    query: "SELECT region, SUM(amount) as total_sales, COUNT(*) as orders, AVG(amount) as avg_order FROM sales GROUP BY region ORDER BY total_sales DESC",
    visualization: "bar",
    resultTable: "sales_by_region", // Reference to mock data
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

// Get all available analytics tables
export function getAnalyticsTables(): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Object.keys(mockAnalyticTables));
    }, 300);
  });
}

// Execute an analytic query
export function executeAnalyticsQuery(
  query: string
): Promise<{ data: any[] | null; error: string | null; duration: number }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        // This is a mock implementation that just returns predefined data
        // based on some keywords in the query
        
        if (query.toLowerCase().includes("region")) {
          resolve({
            data: mockAnalyticTables.sales_by_region,
            error: null,
            duration: Math.random() * 0.2 + 0.3
          });
          return;
        }
        
        if (query.toLowerCase().includes("product") || query.toLowerCase().includes("category")) {
          resolve({
            data: mockAnalyticTables.product_performance,
            error: null,
            duration: Math.random() * 0.2 + 0.3
          });
          return;
        }
        
        if (query.toLowerCase().includes("customer") || query.toLowerCase().includes("segment")) {
          resolve({
            data: mockAnalyticTables.customer_segments,
            error: null,
            duration: Math.random() * 0.2 + 0.3
          });
          return;
        }
        
        if (query.toLowerCase().includes("date") || query.toLowerCase().includes("month") || query.toLowerCase().includes("time")) {
          resolve({
            data: mockAnalyticTables.time_series,
            error: null,
            duration: Math.random() * 0.2 + 0.3
          });
          return;
        }
        
        // If no match, return the first dataset as a fallback
        resolve({
          data: mockAnalyticTables.sales_by_region,
          error: null,
          duration: Math.random() * 0.2 + 0.3
        });
      } catch (error) {
        resolve({
          data: null,
          error: `Error executing analytics query: ${error instanceof Error ? error.message : String(error)}`,
          duration: Math.random() * 0.1 + 0.1
        });
      }
    }, 800); // Simulate a more complex query with longer delay
  });
}

// Get a specific saved analytics query
export function getAnalyticsQuery(id: number): Promise<any> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const query = analyticsQueries.find(q => q.id === id);
      if (query) {
        resolve(query);
      } else {
        reject(new Error(`Analytics query with ID ${id} not found`));
      }
    }, 200);
  });
}

// Get results for a specific predefined analysis
export function getAnalyticsResults(tableName: string): Promise<any[] | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const data = mockAnalyticTables[tableName as keyof typeof mockAnalyticTables];
      resolve(data || null);
    }, 500);
  });
} 