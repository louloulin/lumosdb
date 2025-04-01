import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { logger as honoLogger } from 'hono/logger'
import dotenv from 'dotenv'
import winston from 'winston'
import settingsRoutes from './routes/settings'
import sqliteRoutes from './routes/sqlite'
import duckdbRoutes from './routes/duckdb'
import vectorRoutes from './routes/vector'
import aiRoutes from './routes/ai'

// 配置环境变量
dotenv.config()

// 配置日志记录器
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
})

// 创建 Hono 应用
const app = new Hono()
const apiRoutes = new Hono()

// 中间件
app.use('*', honoLogger())
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}))
app.use('*', secureHeaders())
app.use('*', compress())

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

// 挂载API路由
app.route('/api', apiRoutes)

// 诊断路由
app.get('/routes-debug', (c) => {
  return c.json({
    appRoutes: Object.keys(app.routes),
    apiRoutes: Object.keys(apiRoutes.routes),
    settingsExists: !!settingsRoutes
  })
})

// 挂载子路由
apiRoutes.route('/sqlite', sqliteRoutes)
apiRoutes.route('/duckdb', duckdbRoutes)
apiRoutes.route('/vector', vectorRoutes)
apiRoutes.route('/ai', aiRoutes)
apiRoutes.route('/settings', settingsRoutes)

// 测试设置路由
apiRoutes.get('/test-settings', (c) => {
  return c.json({
    success: true,
    message: 'Test settings route works!',
    settings: {
      general: {
        theme: 'light',
        language: 'zh-CN'
      }
    }
  })
})

// WebSocket 简单示例（在需要时可以扩展）
app.get('/ws', (c) => {
  const upgradeHeader = c.req.header('upgrade')
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected Upgrade: websocket', 400)
  }
  
  // 这里可以添加 WebSocket 处理逻辑
  winstonLogger.info('WebSocket connection established')
  
  return c.text('WebSocket endpoint is available')
})

// 错误处理
app.onError((err, c) => {
  winstonLogger.error('Server error:', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

// 对于 Bun 运行时，导出 fetch 处理函数
export default {
  port: Number(process.env.PORT || 3006),
  fetch: app.fetch
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  winstonLogger.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  winstonLogger.error('Unhandled Rejection at:', { promise, reason })
})

export { app } 