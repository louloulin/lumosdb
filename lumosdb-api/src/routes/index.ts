import { Hono } from 'hono'
import { sqliteRoutes } from './sqlite.js'
import { duckdbRoutes } from './duckdb.js'
import { vectorRoutes } from './vector.js'
import { aiRoutes } from './ai.js'

// 创建 API 路由
export const apiRoutes = new Hono()

// 首页路由
apiRoutes.get('/', (c) => {
  return c.json({ message: 'Welcome to LumosDB API' })
})

// 子路由
apiRoutes.route('/sqlite', sqliteRoutes)
apiRoutes.route('/duckdb', duckdbRoutes)
apiRoutes.route('/vector', vectorRoutes)
apiRoutes.route('/ai', aiRoutes)

// 基础服务健康检查
apiRoutes.get('/status', (c) => {
  return c.json({
    status: 'ok',
    services: {
      sqlite: true,
      duckdb: true,
      vector: true
    },
    version: '0.1.0'
  })
}) 