// 模拟用户数据
export const mockUsers = [
  { id: 1, name: "张三", email: "zhang@example.com", created_at: "2023-01-15", last_login: "2023-04-20", status: "active" },
  { id: 2, name: "李四", email: "li@example.com", created_at: "2023-02-10", last_login: "2023-04-18", status: "active" },
  { id: 3, name: "王五", email: "wang@example.com", created_at: "2023-01-20", last_login: "2023-03-15", status: "inactive" },
  { id: 4, name: "赵六", email: "zhao@example.com", created_at: "2023-03-05", last_login: "2023-04-21", status: "active" },
  { id: 5, name: "钱七", email: "qian@example.com", created_at: "2023-02-25", last_login: "2023-04-10", status: "active" },
];

// 模拟产品数据
export const mockProducts = [
  { id: 1, name: "智能手机", price: 4999, category: "电子产品", stock: 120, created_at: "2023-01-10" },
  { id: 2, name: "无线耳机", price: 999, category: "电子产品", stock: 85, created_at: "2023-01-20" },
  { id: 3, name: "运动T恤", price: 199, category: "服装", stock: 250, created_at: "2023-02-05" },
  { id: 4, name: "牛仔裤", price: 299, category: "服装", stock: 180, created_at: "2023-02-10" },
  { id: 5, name: "有机蔬菜", price: 9.9, category: "食品", stock: 500, created_at: "2023-03-01" },
  { id: 6, name: "进口水果", price: 29.9, category: "食品", stock: 300, created_at: "2023-03-10" },
  { id: 7, name: "平板电脑", price: 2999, category: "电子产品", stock: 50, created_at: "2023-01-15" },
];

// 模拟订单数据
export const mockOrders = [
  { id: 1, user_id: 1, order_date: "2023-04-01", status: "completed", total_amount: 5998 },
  { id: 2, user_id: 2, order_date: "2023-04-05", status: "completed", total_amount: 199 },
  { id: 3, user_id: 3, order_date: "2023-03-15", status: "cancelled", total_amount: 4999 },
  { id: 4, user_id: 1, order_date: "2023-04-10", status: "completed", total_amount: 2999 },
  { id: 5, user_id: 4, order_date: "2023-04-12", status: "processing", total_amount: 329.8 },
  { id: 6, user_id: 5, order_date: "2023-04-15", status: "processing", total_amount: 1298 },
  { id: 7, user_id: 2, order_date: "2023-04-18", status: "completed", total_amount: 599 },
];

// 模拟销售趋势数据
export const mockSalesTrend = [
  { date: '2023-04-01', 电子产品: 12500, 服装: 4500, 食品: 2800 },
  { date: '2023-04-02', 电子产品: 9800, 服装: 3200, 食品: 3100 },
  { date: '2023-04-03', 电子产品: 11200, 服装: 5800, 食品: 2500 },
  { date: '2023-04-04', 电子产品: 13500, 服装: 4200, 食品: 3600 },
  { date: '2023-04-05', 电子产品: 8900, 服装: 6100, 食品: 4200 },
  { date: '2023-04-06', 电子产品: 10500, 服装: 5300, 食品: 3800 },
  { date: '2023-04-07', 电子产品: 14200, 服装: 4900, 食品: 2900 },
  { date: '2023-04-08', 电子产品: 12800, 服装: 5600, 食品: 3200 },
  { date: '2023-04-09', 电子产品: 11000, 服装: 4800, 食品: 3500 },
  { date: '2023-04-10', 电子产品: 13800, 服装: 6200, 食品: 2700 },
  { date: '2023-04-11', 电子产品: 9500, 服装: 5500, 食品: 4100 },
  { date: '2023-04-12', 电子产品: 10800, 服装: 4700, 食品: 3900 },
  { date: '2023-04-13', 电子产品: 12300, 服装: 5900, 食品: 3000 },
  { date: '2023-04-14', 电子产品: 15000, 服装: 5200, 食品: 3400 },
  { date: '2023-04-15', 电子产品: 14500, 服装: 6500, 食品: 2600 },
  { date: '2023-04-16', 电子产品: 11500, 服装: 5000, 食品: 3700 },
  { date: '2023-04-17', 电子产品: 10200, 服装: 4600, 食品: 4000 },
  { date: '2023-04-18', 电子产品: 12900, 服装: 5700, 食品: 3300 },
  { date: '2023-04-19', 电子产品: 13200, 服装: 4300, 食品: 2900 },
  { date: '2023-04-20', 电子产品: 9900, 服装: 6300, 食品: 3800 },
  { date: '2023-04-21', 电子产品: 11800, 服装: 5100, 食品: 3500 },
  { date: '2023-04-22', 电子产品: 14800, 服装: 4800, 食品: 2800 },
  { date: '2023-04-23', 电子产品: 13700, 服装: 6000, 食品: 3200 },
  { date: '2023-04-24', 电子产品: 12100, 服装: 5400, 食品: 3600 },
  { date: '2023-04-25', 电子产品: 10700, 服装: 4500, 食品: 4100 },
  { date: '2023-04-26', 电子产品: 11600, 服装: 5800, 食品: 3400 },
  { date: '2023-04-27', 电子产品: 13100, 服装: 5200, 食品: 3000 },
  { date: '2023-04-28', 电子产品: 15200, 服装: 6200, 食品: 2700 },
  { date: '2023-04-29', 电子产品: 14100, 服装: 5500, 食品: 3300 },
  { date: '2023-04-30', 电子产品: 13500, 服装: 5900, 食品: 3900 },
];

// 模拟地区订单分布数据
export const mockRegionOrders = [
  { region: '华东', orders: 2850 },
  { region: '华南', orders: 1950 },
  { region: '华北', orders: 3100 },
  { region: '西南', orders: 1650 },
  { region: '西北', orders: 1200 },
  { region: '东北', orders: 1750 },
];

// 模拟产品类别分布数据
export const mockCategoryDistribution = [
  { category: '电子产品', value: 385000 },
  { category: '服装', value: 158000 },
  { category: '食品', value: 100000 },
  { category: '家居', value: 85000 },
  { category: '图书', value: 42000 },
];

// 模拟用户行为数据
export const mockUserBehavior = [
  { activity_level: '低', avg_purchase: 180, user_count: 450 },
  { activity_level: '中低', avg_purchase: 320, user_count: 850 },
  { activity_level: '中等', avg_purchase: 650, user_count: 1250 },
  { activity_level: '中高', avg_purchase: 980, user_count: 720 },
  { activity_level: '高', avg_purchase: 1550, user_count: 380 },
];

// 模拟AI助手SQL查询结果
export const generateSQLQueryResult = (prompt: string) => {
  // 基于关键词匹配返回适当的结果
  if (prompt.toLowerCase().includes("user") || prompt.toLowerCase().includes("用户")) {
    return {
      sql: `SELECT id, name, email, created_at, last_login, status 
FROM users 
WHERE status = 'active' 
ORDER BY last_login DESC 
LIMIT 10;`,
      explanation: "查询最近活跃的10个用户，按最后登录时间排序",
      data: mockUsers.filter(user => user.status === "active").sort((a, b) => 
        new Date(b.last_login).getTime() - new Date(a.last_login).getTime()
      ).slice(0, 10)
    };
  } else if (prompt.toLowerCase().includes("product") || prompt.toLowerCase().includes("商品") || prompt.toLowerCase().includes("产品")) {
    return {
      sql: `SELECT id, name, price, category, stock 
FROM products 
WHERE stock < 100 
ORDER BY stock ASC;`,
      explanation: "查询库存低于100的产品，按库存量升序排序，以便及时补货",
      data: mockProducts.filter(product => product.stock < 100).sort((a, b) => a.stock - b.stock)
    };
  } else if (prompt.toLowerCase().includes("order") || prompt.toLowerCase().includes("订单")) {
    return {
      sql: `SELECT o.id, u.name as customer, o.order_date, o.status, o.total_amount 
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'processing' 
ORDER BY o.order_date ASC;`,
      explanation: "查询所有正在处理中的订单，按下单日期升序排序，优先处理较早的订单",
      data: mockOrders.filter(order => order.status === "processing").map(order => {
        const user = mockUsers.find(u => u.id === order.user_id);
        return {
          id: order.id,
          customer: user ? user.name : "未知用户",
          order_date: order.order_date,
          status: order.status,
          total_amount: order.total_amount
        };
      }).sort((a, b) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime())
    };
  } else if (prompt.toLowerCase().includes("sales") || prompt.toLowerCase().includes("sale") || prompt.toLowerCase().includes("销售")) {
    return {
      sql: `SELECT 
  DATE(order_date) as date,
  SUM(CASE WHEN p.category = '电子产品' THEN oi.price * oi.quantity ELSE 0 END) as 电子产品,
  SUM(CASE WHEN p.category = '服装' THEN oi.price * oi.quantity ELSE 0 END) as 服装,
  SUM(CASE WHEN p.category = '食品' THEN oi.price * oi.quantity ELSE 0 END) as 食品
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
WHERE order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY DATE(order_date)
ORDER BY date;`,
      explanation: "按日期和产品类别统计近30天的销售额",
      data: mockSalesTrend.slice(-10) // 最近10天的数据
    };
  } else {
    // 默认返回一些简单的聚合统计
    return {
      sql: `SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT p.id) as total_products,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total_amount) as total_revenue
FROM users u, products p, orders o;`,
      explanation: "统计系统中的用户数、产品数、订单数和总收入",
      data: [
        { 
          total_users: mockUsers.length, 
          total_products: mockProducts.length, 
          total_orders: mockOrders.length, 
          total_revenue: mockOrders.reduce((sum, order) => sum + order.total_amount, 0)
        }
      ]
    };
  }
}; 