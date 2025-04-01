import winston from 'winston';

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 创建日志记录器
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'lumosdb-api' },
  transports: [
    // 写入所有日志到控制台
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // 写入所有错误日志到 error.log 文件
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // 写入所有日志到 combined.log 文件
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// 如果不是生产环境，则设置简单输出格式
if (process.env.NODE_ENV !== 'production') {
  logger.format = winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  );
} 