import { Hono } from 'hono'

export const duckdbRoutes = new Hono()

// 获取所有DuckDB表
duckdbRoutes.get('/tables', async (c) => {
  return c.json({ 
    tables: ['sales', 'customer_analytics', 'product_metrics'] 
  })
})

// 执行DuckDB查询
duckdbRoutes.post('/query', async (c) => {
  const data = await c.req.json()
  
  // 模拟查询结果
  return c.json({
    columns: ['date', 'revenue', 'profit'],
    types: ['DATE', 'DECIMAL', 'DECIMAL'],
    data: [
      ['2023-01-01', 15000, 4500],
      ['2023-01-02', 12000, 3600],
      ['2023-01-03', 18000, 5400]
    ],
    rowCount: 3
  })
})

export default duckdbRoutes 