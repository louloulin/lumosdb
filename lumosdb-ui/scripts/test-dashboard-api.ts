/**
 * 仪表盘API测试脚本
 * 用于测试仪表盘服务与实际API的交互
 * 使用: ts-node test-dashboard-api.ts
 */

import {
  getDashboards,
  getDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  addWidget,
  deleteWidget,
  shareDashboard,
  Dashboard
} from '../src/lib/api/dashboard-service';

// 配置API基础URL
process.env.API_BASE_URL = 'http://localhost:8080';

// 用于存储测试中创建的资源ID
const testIds: { dashboardId?: string; widgetId?: string } = {};

// 彩色日志输出
const log = {
  info: (msg: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg: string) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`)
};

/**
 * 运行所有测试
 */
async function runTests() {
  log.info('开始测试仪表盘服务...');
  
  try {
    // 测试获取仪表盘列表
    await testGetDashboards();
    
    // 测试创建仪表盘
    await testCreateDashboard();
    
    // 测试获取单个仪表盘
    await testGetDashboard();
    
    // 测试更新仪表盘
    await testUpdateDashboard();
    
    // 测试添加小部件
    await testAddWidget();
    
    // 测试共享仪表盘
    await testShareDashboard();
    
    // 测试删除小部件
    await testDeleteWidget();
    
    // 测试删除仪表盘
    await testDeleteDashboard();
    
    log.success('所有测试已完成!');
  } catch (error) {
    log.error(`测试过程中发生错误: ${error instanceof Error ? error.message : String(error)}`);
    
    // 清理资源
    await cleanup();
    process.exit(1);
  }
}

/**
 * 测试获取仪表盘列表
 */
async function testGetDashboards() {
  log.info('测试: 获取仪表盘列表');
  
  try {
    const dashboards = await getDashboards();
    log.success(`成功获取 ${dashboards.length} 个仪表盘`);
  } catch (error) {
    throw new Error(`获取仪表盘列表失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 测试创建仪表盘
 */
async function testCreateDashboard() {
  log.info('测试: 创建仪表盘');
  
  try {
    const newDashboard = {
      name: `测试仪表盘 ${Date.now()}`,
      description: '这是一个自动化测试创建的仪表盘',
      widgets: [],
      isPublic: false
    };
    
    const dashboard = await createDashboard(newDashboard);
    testIds.dashboardId = dashboard.id;
    
    log.success(`成功创建仪表盘: ${dashboard.name} (ID: ${dashboard.id})`);
  } catch (error) {
    throw new Error(`创建仪表盘失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 测试获取单个仪表盘
 */
async function testGetDashboard() {
  if (!testIds.dashboardId) {
    log.warn('跳过获取仪表盘测试: 没有可用的仪表盘ID');
    return;
  }
  
  log.info(`测试: 获取仪表盘 (ID: ${testIds.dashboardId})`);
  
  try {
    const dashboard = await getDashboard(testIds.dashboardId);
    log.success(`成功获取仪表盘: ${dashboard.name}`);
  } catch (error) {
    throw new Error(`获取仪表盘失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 测试更新仪表盘
 */
async function testUpdateDashboard() {
  if (!testIds.dashboardId) {
    log.warn('跳过更新仪表盘测试: 没有可用的仪表盘ID');
    return;
  }
  
  log.info(`测试: 更新仪表盘 (ID: ${testIds.dashboardId})`);
  
  try {
    const updates = {
      name: `更新的仪表盘 ${Date.now()}`,
      description: '这个仪表盘已被更新'
    };
    
    const dashboard = await updateDashboard(testIds.dashboardId, updates);
    log.success(`成功更新仪表盘: ${dashboard.name}`);
  } catch (error) {
    throw new Error(`更新仪表盘失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 测试添加小部件
 */
async function testAddWidget() {
  if (!testIds.dashboardId) {
    log.warn('跳过添加小部件测试: 没有可用的仪表盘ID');
    return;
  }
  
  log.info(`测试: 添加小部件到仪表盘 (ID: ${testIds.dashboardId})`);
  
  try {
    const newWidget = {
      type: 'bar' as const,
      title: '测试图表',
      query: 'SELECT date, COUNT(*) FROM events GROUP BY date',
      width: 1 as const,
      height: 1 as const,
      options: {
        showLegend: true
      }
    };
    
    const dashboard = await addWidget(testIds.dashboardId, newWidget);
    
    // 保存小部件ID用于后续测试
    if (dashboard.widgets.length > 0) {
      testIds.widgetId = dashboard.widgets[dashboard.widgets.length - 1].id;
    }
    
    log.success(`成功添加小部件 (ID: ${testIds.widgetId})`);
  } catch (error) {
    throw new Error(`添加小部件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 测试共享仪表盘
 */
async function testShareDashboard() {
  if (!testIds.dashboardId) {
    log.warn('跳过共享仪表盘测试: 没有可用的仪表盘ID');
    return;
  }
  
  log.info(`测试: 共享仪表盘 (ID: ${testIds.dashboardId})`);
  
  try {
    const shareOptions = {
      isPublic: true,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24小时后过期
    };
    
    const result = await shareDashboard(testIds.dashboardId, shareOptions);
    log.success(`成功共享仪表盘: ${result.url}`);
  } catch (error) {
    throw new Error(`共享仪表盘失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 测试删除小部件
 */
async function testDeleteWidget() {
  if (!testIds.dashboardId || !testIds.widgetId) {
    log.warn('跳过删除小部件测试: 没有可用的仪表盘ID或小部件ID');
    return;
  }
  
  log.info(`测试: 从仪表盘 (ID: ${testIds.dashboardId}) 中删除小部件 (ID: ${testIds.widgetId})`);
  
  try {
    const dashboard = await deleteWidget(testIds.dashboardId, testIds.widgetId);
    log.success(`成功删除小部件 (剩余小部件: ${dashboard.widgets.length})`);
  } catch (error) {
    throw new Error(`删除小部件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 测试删除仪表盘
 */
async function testDeleteDashboard() {
  if (!testIds.dashboardId) {
    log.warn('跳过删除仪表盘测试: 没有可用的仪表盘ID');
    return;
  }
  
  log.info(`测试: 删除仪表盘 (ID: ${testIds.dashboardId})`);
  
  try {
    const result = await deleteDashboard(testIds.dashboardId);
    log.success(`成功删除仪表盘: ${result ? '是' : '否'}`);
    
    // 清除ID，表示已删除
    testIds.dashboardId = undefined;
  } catch (error) {
    throw new Error(`删除仪表盘失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 清理测试资源
 */
async function cleanup() {
  log.info('清理测试资源...');
  
  // 删除测试过程中创建的仪表盘
  if (testIds.dashboardId) {
    try {
      await deleteDashboard(testIds.dashboardId);
      log.success(`清理: 已删除仪表盘 (ID: ${testIds.dashboardId})`);
    } catch (error) {
      log.error(`清理: 删除仪表盘失败 (ID: ${testIds.dashboardId}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 执行测试
runTests().catch(error => {
  log.error(`测试脚本执行失败: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}); 