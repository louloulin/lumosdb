"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

interface MobileOptimizedViewProps {
  children: React.ReactNode
  className?: string
}

export function MobileOptimizedView({ children, className }: MobileOptimizedViewProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [zoom, setZoom] = useState(1)
  const pathname = usePathname()
  
  useEffect(() => {
    setIsMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])
  
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 1.5))
  }
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.7))
  }
  
  const resetZoom = () => {
    setZoom(1)
  }
  
  // 如果还没有客户端渲染或不是移动设备，直接返回原内容
  if (!isMounted || !isMobile) {
    return <>{children}</>
  }
  
  // 特定页面不需要优化视图（例如仪表盘首页等简单页面）
  const excludedPaths = ['/', '/dashboard', '/dashboard/theme', '/dashboard/language']
  if (excludedPaths.includes(pathname)) {
    return <>{children}</>
  }
  
  return (
    <div className={cn("relative", className)}>
      {/* 页面缩放控制 */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        <Button variant="outline" size="icon" onClick={handleZoomIn} className="rounded-full bg-background/80 backdrop-blur">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} className="rounded-full bg-background/80 backdrop-blur">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={resetZoom} className="rounded-full bg-background/80 backdrop-blur">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      
      {/* 内容容器，应用缩放变换 */}
      <div 
        className="origin-top overflow-auto pb-20"
        style={{ 
          transform: `scale(${zoom})`, 
          transformOrigin: "top left",
          minHeight: `calc(100vh / ${zoom})`,
          width: `calc(100% / ${zoom})` 
        }}
      >
        {children}
      </div>
    </div>
  )
} 