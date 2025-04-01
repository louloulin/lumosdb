import { Hono } from 'hono'

export const aiRoutes = new Hono()

// 根据自然语言生成SQL查询
aiRoutes.post('/query-generator', async (c) => {
  const data = await c.req.json()
  
  // 模拟AI响应
  const response = {
    query: `SELECT u.user_id, u.username, SUM(o.amount) as total_amount
FROM users u
JOIN orders o ON u.user_id = o.user_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.user_id, u.username
HAVING total_amount > 1000
ORDER BY total_amount DESC;`,
    explanation: "这个查询查找了最近30天内购买总金额超过1000的用户，并按照总金额降序排列。",
    tables: ['users', 'orders'],
    columns: [
      { name: 'user_id', table: 'users', dataType: 'INTEGER' },
      { name: 'username', table: 'users', dataType: 'TEXT' },
      { name: 'amount', table: 'orders', dataType: 'REAL' },
      { name: 'created_at', table: 'orders', dataType: 'DATETIME' }
    ]
  }
  
  return c.json(response)
})

export default aiRoutes 