"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, MobileOnly, TabletOnly, DesktopOnly } from "@/components/responsive-container";
import { motion } from "framer-motion";

// 动画变体定义
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      delayChildren: 0.2,
      duration: 0.5 
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  hover: { 
    scale: 1.03,
    boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.1)",
    transition: { duration: 0.2 } 
  }
};

const backgroundPattern = {
  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0)`,
  backgroundSize: '24px 24px',
};

export default function Home() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 overflow-hidden" style={backgroundPattern}>
      <div className="container px-4 md:px-6 relative">
        {/* 背景装饰 */}
        <div className="absolute top-40 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <ResponsiveContainer>
          <MobileOnly>
            <motion.div 
              className="flex flex-col items-center space-y-4 text-center"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div className="space-y-2" variants={itemVariants}>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  欢迎使用 LumosDB 移动版
                </h1>
                <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  完全触控优化的数据库管理工具，随时随地管理您的数据。
                </p>
              </motion.div>
              <motion.div className="space-y-2 w-full" variants={itemVariants}>
                <Link href="/dashboard" legacyBehavior passHref>
                  <Button className="w-full" size="lg">
                    进入移动仪表盘
                  </Button>
                </Link>
              </motion.div>
              <motion.div className="mt-8" variants={itemVariants}>
                <img 
                  src="/mobile-preview.png" 
                  alt="LumosDB 移动版"
                  className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://placehold.co/300x600/222/fff?text=LumosDB+Mobile";
                  }}
                />
              </motion.div>
            </motion.div>
          </MobileOnly>

          <TabletOnly>
            <motion.div 
              className="flex flex-col items-center space-y-4 text-center"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div className="space-y-2" variants={itemVariants}>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  欢迎使用 LumosDB 平板版
                </h1>
                <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  为平板设备优化的界面，提供更好的数据可视化体验。
                </p>
              </motion.div>
              <motion.div className="flex flex-col md:flex-row gap-4" variants={itemVariants}>
                <Link href="/dashboard" legacyBehavior passHref>
                  <Button size="lg">
                    进入仪表盘
                  </Button>
                </Link>
                <Link href="/dashboard/analytics" legacyBehavior passHref>
                  <Button variant="outline" size="lg">
                    查看分析
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </TabletOnly>

          <DesktopOnly>
            <motion.div 
              className="flex flex-col items-center space-y-4 text-center"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div className="space-y-2" variants={itemVariants}>
                <motion.h1 
                  className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-500"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                >
                  欢迎使用 LumosDB
                </motion.h1>
                <motion.p
                  className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400"
                  variants={itemVariants}
                >
                  一款强大的数据库管理系统，结合了 SQLite 和向量数据库的功能，提供实时数据分析和高级可视化。
                </motion.p>
              </motion.div>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                variants={itemVariants}
              >
                <Link href="/dashboard" legacyBehavior passHref>
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all duration-300 transform hover:scale-105"
                  >
                    进入仪表盘
                  </Button>
                </Link>
                <Link href="/dashboard/analytics" legacyBehavior passHref>
                  <Button variant="outline" size="lg" className="transition-all duration-300 transform hover:scale-105">
                    查看分析仪表盘
                  </Button>
                </Link>
                <Link href="/docs" legacyBehavior passHref>
                  <Button variant="outline" size="lg" className="transition-all duration-300 transform hover:scale-105">
                    查看文档
                  </Button>
                </Link>
              </motion.div>
              
              <motion.div 
                className="w-full max-w-5xl mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.4 }}
              >
                <motion.div 
                  className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-200 dark:border-slate-700"
                  variants={cardVariants}
                  whileHover="hover"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mr-3">
                      <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold">SQLite 管理</h3>
                  </div>
                  <p className="text-muted-foreground">管理关系型数据，创建表，执行 SQL 查询</p>
                </motion.div>
                
                <motion.div 
                  className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-200 dark:border-slate-700"
                  variants={cardVariants}
                  whileHover="hover"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mr-3">
                      <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold">向量数据</h3>
                  </div>
                  <p className="text-muted-foreground">管理向量集合，执行相似度搜索，嵌入数据</p>
                </motion.div>
                
                <motion.div 
                  className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-200 dark:border-slate-700"
                  variants={cardVariants}
                  whileHover="hover"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mr-3">
                      <svg className="h-5 w-5 text-green-600 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold">实时分析</h3>
                  </div>
                  <p className="text-muted-foreground">创建自定义仪表盘，监控数据变化，导出报告</p>
                </motion.div>
              </motion.div>
              
              <motion.div 
                className="w-full max-w-5xl mt-16"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
              >
                <motion.h2 
                  className="text-2xl md:text-3xl font-bold mb-6 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  专为 AI 应用设计
                </motion.h2>
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delayChildren: 0.8, staggerChildren: 0.1 }}
                >
                  <motion.div 
                    className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300"
                    variants={cardVariants}
                    whileHover="hover"
                  >
                    <div className="mb-4 text-indigo-600 dark:text-indigo-400">
                      <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold mb-2">高效矢量搜索</h3>
                    <p className="text-muted-foreground">内置向量存储和相似度搜索功能，支持AI和机器学习应用</p>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300"
                    variants={cardVariants}
                    whileHover="hover"
                  >
                    <div className="mb-4 text-blue-600 dark:text-blue-400">
                      <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold mb-2">AI 上下文管理</h3>
                    <p className="text-muted-foreground">高效管理LLM会话上下文和历史记录，优化交互体验</p>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300"
                    variants={cardVariants}
                    whileHover="hover"
                  >
                    <div className="mb-4 text-green-600 dark:text-green-400">
                      <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold mb-2">知识库构建</h3>
                    <p className="text-muted-foreground">构建和查询结构化知识库，为AI提供可靠的信息源</p>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300"
                    variants={cardVariants}
                    whileHover="hover"
                  >
                    <div className="mb-4 text-purple-600 dark:text-purple-400">
                      <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0h10a2 2 0 012 2v2H7a2 2 0 00-2 2v4a2 2 0 002 2h10a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4-3h.01M17 16h.01" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold mb-2">ETL 数据流</h3>
                    <p className="text-muted-foreground">强大的数据提取、转换和加载功能，支持AI数据处理管道</p>
                  </motion.div>
                </motion.div>
              </motion.div>
              
              <motion.div 
                className="w-full max-w-5xl mt-16"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 1 }}
              >
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-8 shadow-2xl">
                  {/* 装饰元素 */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600"></div>
                  <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-blue-400/20 blur-2xl"></div>
                  <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-indigo-400/20 blur-2xl"></div>
                  
                  <motion.h3 
                    className="text-2xl font-bold mb-2 text-white"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.1 }}
                  >
                    多引擎支持
                  </motion.h3>
                  <motion.p 
                    className="text-blue-100 mb-6"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.2 }}
                  >
                    集成SQLite和DuckDB引擎，提供不同类型的数据处理能力
                  </motion.p>
                  
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delayChildren: 1.3, staggerChildren: 0.1 }}
                  >
                    <motion.div 
                      className="flex items-start bg-white/10 backdrop-blur-sm rounded-lg p-4"
                      variants={itemVariants}
                      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    >
                      <div className="rounded-full bg-green-400/20 p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-green-400" viewBox="0 0 16 16">
                          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
                        </svg>
                      </div>
                      <span className="text-white">高性能缓存策略，提高查询速度</span>
                    </motion.div>
                    
                    <motion.div 
                      className="flex items-start bg-white/10 backdrop-blur-sm rounded-lg p-4"
                      variants={itemVariants}
                      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    >
                      <div className="rounded-full bg-green-400/20 p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-green-400" viewBox="0 0 16 16">
                          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
                        </svg>
                      </div>
                      <span className="text-white">基于Actor模型实现高并发</span>
                    </motion.div>
                    
                    <motion.div 
                      className="flex items-start bg-white/10 backdrop-blur-sm rounded-lg p-4"
                      variants={itemVariants}
                      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    >
                      <div className="rounded-full bg-green-400/20 p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-green-400" viewBox="0 0 16 16">
                          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
                        </svg>
                      </div>
                      <span className="text-white">WebAssembly插件系统可扩展性</span>
                    </motion.div>
                    
                    <motion.div 
                      className="flex items-start bg-white/10 backdrop-blur-sm rounded-lg p-4"
                      variants={itemVariants}
                      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    >
                      <div className="rounded-full bg-green-400/20 p-2 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-green-400" viewBox="0 0 16 16">
                          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
                        </svg>
                      </div>
                      <span className="text-white">DAG工作流编排复杂任务</span>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </DesktopOnly>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
