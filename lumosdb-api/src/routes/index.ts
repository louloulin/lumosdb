import { Hono } from 'hono'
import sqliteRoutes from './sqlite'
import duckdbRoutes from './duckdb'
import vectorRoutes from './vector'
import aiRoutes from './ai'
import settingsRoutes from './settings'

// 创建API路由
export const app = new Hono()
const apiRoutes = new Hono()

// 根路由
app.get('/', (c) => {
  return c.json({
    message: 'Welcome to LumosDB API'
  })
})

// 健康检查路由
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    message: 'LumosDB API is running', 
    version: '1.0.0'
  })
})

// 挂载子路由
app.route('/api', apiRoutes)
apiRoutes.route('/sqlite', sqliteRoutes)
apiRoutes.route('/duckdb', duckdbRoutes)
apiRoutes.route('/vector', vectorRoutes)
apiRoutes.route('/ai', aiRoutes)
apiRoutes.route('/settings', settingsRoutes)

export default app 