"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { 
  Home, 
  Database, 
  Grid3X3, 
  BarChart4, 
  Settings, 
  User, 
  Activity,
  LogOut,
  MoonStar,
  Sun,
  Code,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download
} from "lucide-react"
import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SideNavProps extends React.HTMLAttributes<HTMLDivElement> {
  // Additional props can be added here if needed
}

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  matches: (path: string) => boolean
  children?: NavSubItem[]
}

interface NavSubItem {
  name: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  title: string
  items: NavItem[]
}

export function SideNav({ className, ...props }: SideNavProps) {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const navigationGroups: NavGroup[] = [
    {
      title: "概览",
      items: [
        {
          name: "仪表盘",
          href: "/dashboard",
          icon: Home,
          matches: (path: string) => path === "/dashboard"
        }
      ]
    },
    {
      title: "数据存储",
      items: [
        {
          name: "SQLite",
          href: "/dashboard/sqlite",
          icon: Database,
          matches: (path: string) => path.startsWith("/dashboard/sqlite")
        },
        {
          name: "DuckDB",
          href: "/dashboard/duckdb",
          icon: Database,
          matches: (path: string) => path.startsWith("/dashboard/duckdb")
        },
        {
          name: "SQL 编辑器",
          href: "/dashboard/sql-editor",
          icon: Code,
          matches: (path: string) => path.startsWith("/dashboard/sql-editor")
        },
        {
          name: "向量数据",
          href: "/dashboard/vectors",
          icon: Grid3X3,
          matches: (path: string) => path.startsWith("/dashboard/vectors")
        }
      ]
    },
    {
      title: "监控与分析",
      items: [
        {
          name: "分析面板",
          href: "/dashboard/analytics",
          icon: BarChart4,
          matches: (path: string) => path.startsWith("/dashboard/analytics")
        },
        {
          name: "实时数据",
          href: "/dashboard/realtime",
          icon: Activity,
          matches: (path: string) => path.startsWith("/dashboard/realtime")
        }
      ]
    },
    {
      title: "系统管理",
      items: [
        {
          name: "设置",
          href: "/dashboard/settings",
          icon: Settings,
          matches: (path: string) => path.startsWith("/dashboard/settings")
        },
        {
          name: "个人资料",
          href: "/dashboard/profile",
          icon: User,
          matches: (path: string) => path.startsWith("/dashboard/profile")
        },
        {
          name: "安装应用",
          href: "/dashboard/install",
          icon: Download,
          matches: (path: string) => path.startsWith("/dashboard/install")
        }
      ]
    }
  ]

  // Check if a navigation item is active
  const isActive = (item: NavItem) => {
    return item.matches ? item.matches(pathname) : pathname === item.href
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={cn(
          "h-screen border-r border-border bg-background transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64",
          className
        )} 
        {...props}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center h-16 px-5 border-b border-border">
            {!collapsed && (
              <div className="flex items-center">
                <Database className="h-6 w-6 text-primary" />
                <span className="ml-2 text-xl font-semibold">LumosDB</span>
              </div>
            )}
            {collapsed && (
              <Database className="h-6 w-6 text-primary mx-auto" />
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("ml-auto", collapsed && "mx-auto")}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {navigationGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-6">
                {!collapsed && (
                  <div className="mb-2 px-2">
                    <h3 className="text-xs font-medium text-muted-foreground">{group.title}</h3>
                  </div>
                )}
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActive(item);
                    
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                              collapsed && "justify-center"
                            )}
                          >
                            <item.icon className={cn("h-5 w-5", collapsed ? "" : "mr-3")} />
                            {!collapsed && <span>{item.name}</span>}
                          </Link>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">
                            {item.name}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-3 space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={cn(
                    "w-full flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center"
                  )}
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className={cn("h-5 w-5", collapsed ? "" : "mr-3")} />
                      {!collapsed && <span>亮色主题</span>}
                    </>
                  ) : (
                    <>
                      <MoonStar className={cn("h-5 w-5", collapsed ? "" : "mr-3")} />
                      {!collapsed && <span>暗色主题</span>}
                    </>
                  )}
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  {theme === "dark" ? "切换亮色主题" : "切换暗色主题"}
                </TooltipContent>
              )}
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className={cn(
                    "w-full flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center"
                  )}
                >
                  <LogOut className={cn("h-5 w-5", collapsed ? "" : "mr-3")} />
                  {!collapsed && <span>退出登录</span>}
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  退出登录
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
} 