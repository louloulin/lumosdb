import express from 'express';
import sqliteRoutes from './sqlite.js';
import duckdbRoutes from './duckdb.js';
import vectorRoutes from './vector.js';
import aiRoutes from './ai.js';
import adminRoutes from './admin.js';

const router = express.Router();

// API 版本控制
router.use('/v1/sqlite', sqliteRoutes);
router.use('/v1/duckdb', duckdbRoutes);
router.use('/v1/vector', vectorRoutes);
router.use('/v1/ai', aiRoutes);
router.use('/v1/admin', adminRoutes);

export default router; 