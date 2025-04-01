"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, MobileOnly, TabletOnly, DesktopOnly } from "@/components/responsive-container"

export default function Home() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <ResponsiveContainer>
          <MobileOnly>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  欢迎使用 LumosDB 移动版
                </h1>
                <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  完全触控优化的数据库管理工具，随时随地管理您的数据。
                </p>
              </div>
              <div className="space-y-2 w-full">
                <Link href="/dashboard" legacyBehavior passHref>
                  <Button className="w-full" size="lg">
                    进入移动仪表盘
                  </Button>
                </Link>
              </div>
              <div className="mt-8">
                <img 
                  src="/mobile-preview.png" 
                  alt="LumosDB 移动版"
                  className="w-full max-w-sm mx-auto rounded-lg shadow-lg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://placehold.co/300x600/222/fff?text=LumosDB+Mobile";
                  }}
                />
              </div>
            </div>
          </MobileOnly>

          <TabletOnly>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  欢迎使用 LumosDB 平板版
                </h1>
                <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  为平板设备优化的界面，提供更好的数据可视化体验。
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
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
              </div>
            </div>
          </TabletOnly>

          <DesktopOnly>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
                  欢迎使用 LumosDB
                </h1>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  一款强大的数据库管理系统，结合了 SQLite 和向量数据库的功能，提供实时数据分析和高级可视化。
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard" legacyBehavior passHref>
                  <Button size="lg">
                    进入仪表盘
                  </Button>
                </Link>
                <Link href="/dashboard/analytics" legacyBehavior passHref>
                  <Button variant="outline" size="lg">
                    查看分析仪表盘
                  </Button>
                </Link>
                <Link href="/docs" legacyBehavior passHref>
                  <Button variant="outline" size="lg">
                    查看文档
                  </Button>
                </Link>
              </div>
              <div className="w-full max-w-5xl mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-2">SQLite 管理</h3>
                  <p className="text-muted-foreground">管理关系型数据，创建表，执行 SQL 查询</p>
                </div>
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-2">向量数据</h3>
                  <p className="text-muted-foreground">管理向量集合，执行相似度搜索，嵌入数据</p>
                </div>
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-2">实时分析</h3>
                  <p className="text-muted-foreground">创建自定义仪表盘，监控数据变化，导出报告</p>
                </div>
              </div>
            </div>
          </DesktopOnly>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
