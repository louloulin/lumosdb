import { Hono } from 'hono'

export const vectorRoutes = new Hono()

// 获取所有向量集合
vectorRoutes.get('/collections', async (c) => {
  return c.json({ 
    collections: ['documents', 'images', 'embeddings'] 
  })
})

// 获取集合中的向量
vectorRoutes.get('/collections/:collection', async (c) => {
  const collection = c.req.param('collection')
  const limit = parseInt(c.req.query('limit') || '10')
  const offset = parseInt(c.req.query('offset') || '0')
  
  // 模拟向量数据
  return c.json({
    collection,
    total: 1000,
    limit,
    offset,
    vectors: Array(Math.min(limit, 10)).fill(0).map((_, i) => ({
      id: `vec_${offset + i}`,
      metadata: { title: `Item ${offset + i}` },
      dimensions: 5,
      vector: [0.1, 0.2, 0.3, 0.4, 0.5]
    }))
  })
})

export default vectorRoutes 