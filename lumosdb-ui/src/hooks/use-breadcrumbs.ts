"use client"

import { usePathname } from "next/navigation"
import { useMemo } from "react"

interface BreadcrumbItem {
  label: string
  href: string
}

const routeLabels: Record<string, string> = {
  dashboard: "仪表盘",
  sqlite: "SQLite",
  vectors: "向量数据",
  analytics: "分析",
  realtime: "实时数据",
  settings: "设置",
  profile: "个人资料",
  "sql-editor": "SQL 编辑器",
  search: "搜索",
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname()

  return useMemo(() => {
    if (pathname === "/dashboard") {
      return []
    }

    const segments = pathname.split("/").filter(Boolean)
    
    // Build breadcrumbs based on the current path
    const breadcrumbs: BreadcrumbItem[] = []
    let currentPath = ""

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      currentPath += `/${segment}`
      
      // Skip 'dashboard' in the breadcrumbs if it's not the only segment
      if (segment === "dashboard" && segments.length > 1) {
        continue
      }

      const label = routeLabels[segment] || segment
      breadcrumbs.push({
        label,
        href: currentPath,
      })
    }

    return breadcrumbs
  }, [pathname])
} 