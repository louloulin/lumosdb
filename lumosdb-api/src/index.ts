import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import apiRoutes from './routes';

// 加载环境变量
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// 设置Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(helmet());
app.use(morgan('combined', { stream: { write: message => logger.info(message) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'LumosDB API is running' });
});

// API路由
app.use('/api', apiRoutes);

// 错误处理中间件
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 设置WebSocket连接
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('subscribe', (tables) => {
    if (Array.isArray(tables)) {
      tables.forEach(table => {
        socket.join(`table:${table}`);
        logger.info(`Client ${socket.id} subscribed to table: ${table}`);
      });
    }
  });
  
  socket.on('unsubscribe', (tables) => {
    if (Array.isArray(tables)) {
      tables.forEach(table => {
        socket.leave(`table:${table}`);
        logger.info(`Client ${socket.id} unsubscribed from table: ${table}`);
      });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// 启动服务器
httpServer.listen(PORT, () => {
  logger.info(`⚡️ LumosDB API server running at http://localhost:${PORT}`);
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export { app, io }; 