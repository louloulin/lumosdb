#!/usr/bin/env tsx

/**
 * 分析服务API集成测试
 * 用于测试analytics-service.ts的实际API调用
 * 
 * 运行方法: npm run test-analytics-api
 */

import { config } from 'dotenv';
import { 
  executeAnalyticsQuery, 
  getAnalyticsTables, 
  saveAnalyticsQuery, 
  getAnalyticsQueries,
  getAnalyticsQuery,
  updateAnalyticsQuery,
  deleteAnalyticsQuery,
  generateTableSummary,
  performTimeSeriesAnalysis,
  detectAnomalies,
  createAnalyticsReport,
  getAnalyticsReports,
  getAnalyticsReport,
  updateAnalyticsReport,
  deleteAnalyticsReport,
  generateAnalyticsReport,
  getLatestReportResult,
  getDataMetrics,
  createDataMetric,
  updateDataMetric,
  deleteDataMetric,
  generateDataDashboard,
  AnalyticsQuery,
  AnalyticsReport,
  DataMetric
} from '../src/lib/api/analytics-service';
import { sdkClient } from '../src/lib/api/sdk-client';

// 加载环境变量
config({ path: '.env.local' });
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 初始化SDK客户端
const initializeClient = () => {
  console.log(`初始化SDK客户端，API地址: ${API_URL}`);
  sdkClient.initialize(API_URL);
};

/**
 * 测试执行SQL分析查询
 */
const testExecuteAnalyticsQuery = async () => {
  try {
    console.log('测试: 执行分析查询');
    
    const query = `
      SELECT 
        'product' as category, 
        CAST(random() * 1000 AS INTEGER) as value,
        '2023-' || CAST(1 + random() * 11 AS INTEGER) || '-' || CAST(1 + random() * 28 AS INTEGER) as date
      FROM generate_series(1, 20)
    `;
    
    const result = await executeAnalyticsQuery(query);
    
    console.log('查询结果:', result.data ? `${result.data.length} 行数据` : '无数据');
    console.log('示例数据:', result.data ? result.data.slice(0, 3) : 'N/A');
    console.log('查询耗时:', result.duration, '秒');
    
    return result.data;
  } catch (err) {
    console.error('执行分析查询失败:', err);
    throw err;
  }
};

/**
 * 测试分析表格相关功能
 */
const testAnalyticsTables = async () => {
  try {
    console.log('测试: 获取分析表格列表');
    
    const tables = await getAnalyticsTables();
    
    console.log('表格列表:', tables);
    
    return tables;
  } catch (err) {
    console.error('获取分析表格失败:', err);
    throw err;
  }
};

/**
 * 测试保存和获取分析查询
 */
const testSaveAndGetAnalyticsQueries = async () => {
  try {
    console.log('测试: 保存分析查询');
    
    const newQuery: Omit<AnalyticsQuery, 'id'> = {
      name: 'Test Query ' + new Date().toISOString(),
      description: '用于测试的分析查询',
      query: 'SELECT * FROM test_table LIMIT 100',
      visualization: 'table',
      createdAt: new Date().toISOString()
    };
    
    const savedQuery = await saveAnalyticsQuery(newQuery);
    console.log('保存的查询:', savedQuery);
    
    console.log('测试: 获取所有分析查询');
    const queries = await getAnalyticsQueries();
    console.log('查询列表:', queries.map(q => ({ id: q.id, name: q.name })));
    
    console.log('测试: 获取单个分析查询');
    const fetchedQuery = await getAnalyticsQuery(savedQuery.id);
    console.log('获取的查询:', fetchedQuery);
    
    console.log('测试: 更新分析查询');
    const updatedQuery = await updateAnalyticsQuery(savedQuery.id, {
      description: '已更新的测试分析查询'
    });
    console.log('更新后的查询:', updatedQuery);
    
    return savedQuery;
  } catch (err) {
    console.error('保存和获取分析查询失败:', err);
    throw err;
  }
};

/**
 * 测试删除分析查询
 */
const testDeleteAnalyticsQuery = async (queryId: number) => {
  try {
    console.log('测试: 删除分析查询');
    
    const result = await deleteAnalyticsQuery(queryId);
    
    console.log('删除结果:', result ? '成功' : '失败');
    
    return result;
  } catch (err) {
    console.error('删除分析查询失败:', err);
    throw err;
  }
};

/**
 * 测试生成表格摘要
 */
const testGenerateTableSummary = async (tableName: string) => {
  try {
    console.log(`测试: 生成表格摘要 (${tableName})`);
    
    const summary = await generateTableSummary(tableName);
    
    console.log('表格摘要:', summary);
    
    return summary;
  } catch (err) {
    console.error('生成表格摘要失败:', err);
    throw err;
  }
};

/**
 * 测试时间序列分析
 */
const testTimeSeriesAnalysis = async () => {
  try {
    console.log('测试: 时间序列分析');
    
    const result = await performTimeSeriesAnalysis({
      source: 'test_table',
      timestampColumn: 'date',
      valueColumn: 'value',
      interval: 'day',
      aggregation: 'avg'
    });
    
    console.log('时间序列分析结果:', result);
    
    return result;
  } catch (err) {
    console.error('时间序列分析失败:', err);
    throw err;
  }
};

/**
 * 测试异常检测
 */
const testAnomalyDetection = async () => {
  try {
    console.log('测试: 异常检测');
    
    const result = await detectAnomalies({
      source: 'test_table',
      timestampColumn: 'date',
      valueColumn: 'value',
      threshold: 2.0
    });
    
    console.log('异常检测结果:', result);
    
    return result;
  } catch (err) {
    console.error('异常检测失败:', err);
    throw err;
  }
};

/**
 * 测试创建和获取分析报告
 */
const testCreateAndGetReports = async () => {
  try {
    console.log('测试: 创建分析报告');
    
    // 先获取一些分析查询
    const queries = await getAnalyticsQueries();
    const queryIds = queries.slice(0, 2).map(q => q.id);
    
    const newReport: Omit<AnalyticsReport, 'id'> = {
      name: 'Test Report ' + new Date().toISOString(),
      description: '用于测试的分析报告',
      queries: queryIds,
      createdAt: new Date().toISOString(),
      status: 'draft',
      format: 'html'
    };
    
    const savedReport = await createAnalyticsReport(newReport);
    console.log('保存的报告:', savedReport);
    
    console.log('测试: 获取所有分析报告');
    const reports = await getAnalyticsReports();
    console.log('报告列表:', reports.map(r => ({ id: r.id, name: r.name })));
    
    console.log('测试: 获取单个分析报告');
    const fetchedReport = await getAnalyticsReport(savedReport.id);
    console.log('获取的报告:', fetchedReport);
    
    console.log('测试: 更新分析报告');
    const updatedReport = await updateAnalyticsReport(savedReport.id, {
      description: '已更新的测试分析报告',
      status: 'scheduled',
      schedule: {
        frequency: 'daily',
        hour: 8,
        minute: 0,
        timezone: 'Asia/Shanghai',
        active: true
      }
    });
    console.log('更新后的报告:', updatedReport);
    
    return savedReport;
  } catch (err) {
    console.error('创建和获取分析报告失败:', err);
    throw err;
  }
};

/**
 * 测试生成分析报告
 */
const testGenerateReport = async (reportId: string) => {
  try {
    console.log('测试: 生成分析报告');
    
    const result = await generateAnalyticsReport(reportId);
    
    console.log('报告生成结果:', result);
    
    console.log('测试: 获取最新报告结果');
    const latestResult = await getLatestReportResult(reportId);
    console.log('最新报告结果:', latestResult);
    
    return result;
  } catch (err) {
    console.error('生成分析报告失败:', err);
    throw err;
  }
};

/**
 * 测试删除分析报告
 */
const testDeleteReport = async (reportId: string) => {
  try {
    console.log('测试: 删除分析报告');
    
    const result = await deleteAnalyticsReport(reportId);
    
    console.log('删除结果:', result ? '成功' : '失败');
    
    return result;
  } catch (err) {
    console.error('删除分析报告失败:', err);
    throw err;
  }
};

/**
 * 测试创建和获取数据指标
 */
const testCreateAndGetMetrics = async () => {
  try {
    console.log('测试: 创建数据指标');
    
    const newMetric: Omit<DataMetric, 'id' | 'currentValue' | 'previousValue' | 'changePercentage' | 'trend' | 'lastUpdated'> = {
      name: 'Active Users',
      description: '过去30天活跃用户数量',
      query: 'SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL 30 DAY',
      thresholds: {
        warning: 1000,
        critical: 800
      }
    };
    
    const savedMetric = await createDataMetric(newMetric);
    console.log('保存的指标:', savedMetric);
    
    console.log('测试: 获取所有数据指标');
    const metrics = await getDataMetrics();
    console.log('指标列表:', metrics.map(m => ({ id: m.id, name: m.name })));
    
    console.log('测试: 更新数据指标');
    const updatedMetric = await updateDataMetric(savedMetric.id, {
      description: '已更新的测试数据指标',
      thresholds: {
        warning: 1200,
        critical: 1000
      }
    });
    console.log('更新后的指标:', updatedMetric);
    
    return savedMetric;
  } catch (err) {
    console.error('创建和获取数据指标失败:', err);
    throw err;
  }
};

/**
 * 测试删除数据指标
 */
const testDeleteMetric = async (metricId: string) => {
  try {
    console.log('测试: 删除数据指标');
    
    const result = await deleteDataMetric(metricId);
    
    console.log('删除结果:', result ? '成功' : '失败');
    
    return result;
  } catch (err) {
    console.error('删除数据指标失败:', err);
    throw err;
  }
};

/**
 * 测试生成数据仪表盘
 */
const testGenerateDataDashboard = async () => {
  try {
    console.log('测试: 生成数据仪表盘');
    
    // 先获取一些分析查询
    const queries = await getAnalyticsQueries();
    const dashboardQueries = queries.slice(0, 3).map(q => ({
      id: q.id,
      title: q.name,
      visualization: q.visualization
    }));
    
    const dashboardOptions = {
      title: '测试仪表盘',
      description: '用于测试的数据仪表盘',
      queries: dashboardQueries,
      theme: 'light' as const,
      layout: 'grid' as const
    };
    
    const dashboardHtml = await generateDataDashboard(dashboardOptions);
    
    console.log('仪表盘HTML长度:', dashboardHtml.length);
    console.log('仪表盘HTML预览:', dashboardHtml.substring(0, 200) + '...');
    
    return dashboardHtml;
  } catch (err) {
    console.error('生成数据仪表盘失败:', err);
    throw err;
  }
};

/**
 * 运行所有测试
 */
const runAllTests = async () => {
  try {
    // 初始化客户端
    initializeClient();
    
    // 基础分析查询
    await testExecuteAnalyticsQuery();
    
    // 分析表格
    const tables = await testAnalyticsTables();
    
    // 保存和获取分析查询
    const savedQuery = await testSaveAndGetAnalyticsQueries();
    
    // 测试表格摘要
    if (tables.length > 0) {
      await testGenerateTableSummary(tables[0]);
    }
    
    // 时间序列分析和异常检测可能需要真实数据
    try {
      await testTimeSeriesAnalysis();
      await testAnomalyDetection();
    } catch (error: any) {
      console.log('时间序列分析或异常检测测试跳过:', error.message);
    }
    
    // 测试分析报告功能
    const savedReport = await testCreateAndGetReports();
    await testGenerateReport(savedReport.id);
    
    // 测试数据指标功能
    const savedMetric = await testCreateAndGetMetrics();
    
    // 测试生成数据仪表盘
    await testGenerateDataDashboard();
    
    // 清理测试数据
    await testDeleteMetric(savedMetric.id);
    await testDeleteReport(savedReport.id);
    await testDeleteAnalyticsQuery(savedQuery.id);
    
    console.log('所有测试完成!');
  } catch (err) {
    console.error('测试过程中出错:', err);
  }
};

// 执行所有测试
runAllTests(); 