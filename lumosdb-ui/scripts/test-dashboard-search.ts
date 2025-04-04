/**
 * 仪表盘搜索API测试脚本
 * 用于测试仪表盘搜索功能与实际API的交互
 * 使用: bun run scripts/test-dashboard-search.ts
 */

import {
  getDashboards,
  createDashboard,
  deleteDashboard,
  searchDashboards,
  Dashboard
} from '../src/lib/api/dashboard-service';

// 配置API基础URL - 替换为实际API地址
process.env.API_BASE_URL = 'http://localhost:8080';

// 测试用仪表盘名称前缀
const TEST_PREFIX = 'TEST_SEARCH';

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
  log.info('开始测试仪表盘搜索功能...');
  
  try {
    // 创建测试数据
    await createTestDashboards();
    
    // 测试搜索功能
    await testSearchDashboards();
    
    // 清理测试数据
    await cleanupTestDashboards();
    
    log.success('所有测试已完成!');
  } catch (error) {
    log.error(`测试过程中发生错误: ${error instanceof Error ? error.message : String(error)}`);
    
    // 清理资源
    await cleanupTestDashboards();
    process.exit(1);
  }
}

/**
 * 创建测试仪表盘
 */
async function createTestDashboards() {
  log.info('创建测试仪表盘数据');
  
  const dashboardsToCreate = [
    {
      name: `${TEST_PREFIX}_销售分析`,
      description: '销售部门使用的数据分析仪表盘',
      widgets: [],
      isPublic: false
    },
    {
      name: `${TEST_PREFIX}_用户行为`,
      description: '跟踪用户行为的仪表盘',
      widgets: [],
      isPublic: true
    },
    {
      name: `${TEST_PREFIX}_系统监控`,
      description: '系统性能和健康状态监控',
      widgets: [],
      isPublic: false
    }
  ];
  
  for (const dashboard of dashboardsToCreate) {
    try {
      await createDashboard(dashboard);
      log.success(`成功创建测试仪表盘: ${dashboard.name}`);
    } catch (error) {
      log.error(`创建测试仪表盘失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * 测试仪表盘搜索功能
 */
async function testSearchDashboards() {
  log.info('测试: 仪表盘搜索功能');
  
  // 测试案例
  const testCases = [
    { 
      query: '销售', 
      description: '按名称搜索', 
      expectedCount: 1 
    },
    { 
      query: '用户', 
      description: '按名称搜索', 
      expectedCount: 1 
    },
    { 
      query: '监控', 
      description: '按名称搜索', 
      expectedCount: 1 
    },
    { 
      query: TEST_PREFIX, 
      description: '搜索所有测试仪表盘', 
      expectedCount: 3 
    },
    { 
      query: '分析', 
      description: '通用搜索词', 
      expectedMin: 1 
    },
    { 
      query: '不存在的仪表盘', 
      description: '无匹配结果搜索', 
      expectedCount: 0 
    }
  ];
  
  for (const testCase of testCases) {
    try {
      log.info(`执行搜索: "${testCase.query}" (${testCase.description})`);
      const results = await searchDashboards(testCase.query);
      
      // 过滤出测试仪表盘
      const testResults = results.filter(d => d.name.startsWith(TEST_PREFIX));
      
      if ('expectedCount' in testCase) {
        if (testResults.length === testCase.expectedCount) {
          log.success(`搜索成功: 期望 ${testCase.expectedCount} 个结果, 实际 ${testResults.length} 个结果`);
        } else {
          log.error(`搜索结果不匹配: 期望 ${testCase.expectedCount} 个结果, 实际 ${testResults.length} 个结果`);
        }
      } else if ('expectedMin' in testCase && testResults.length >= testCase.expectedMin) {
        log.success(`搜索成功: 至少 ${testCase.expectedMin} 个结果, 实际 ${testResults.length} 个结果`);
      } else {
        log.error(`搜索结果不匹配: 至少期望 ${testCase.expectedMin} 个结果, 实际 ${testResults.length} 个结果`);
      }
      
      // 输出结果摘要
      if (testResults.length > 0) {
        log.info('搜索结果:');
        testResults.forEach(dashboard => {
          console.log(`  - ${dashboard.name} (ID: ${dashboard.id})`);
        });
      }
    } catch (error) {
      log.error(`搜索测试失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestDashboards() {
  log.info('清理测试数据');
  
  // 获取所有仪表盘
  const dashboards = await getDashboards();
  
  // 筛选出测试仪表盘
  const testDashboards = dashboards.filter(d => d.name.startsWith(TEST_PREFIX));
  
  if (testDashboards.length === 0) {
    log.info('没有找到需要清理的测试仪表盘');
    return;
  }
  
  // 删除测试仪表盘
  for (const dashboard of testDashboards) {
    try {
      await deleteDashboard(dashboard.id);
      log.success(`成功删除测试仪表盘: ${dashboard.name} (ID: ${dashboard.id})`);
    } catch (error) {
      log.warn(`删除测试仪表盘失败: ${dashboard.name} (ID: ${dashboard.id}) - ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 执行测试
runTests().catch(error => {
  log.error(`测试执行失败: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}); 