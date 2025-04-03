"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useLoading } from "@/contexts/loading-context";

interface LoadingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  // 指定模块，如果提供则只显示该模块的加载状态
  module?: string;
  // 是否固定在页面顶部
  fixed?: boolean;
  // 是否显示标签文本
  showLabel?: boolean;
  // 自定义标签文本
  label?: string;
  // 位置：顶部、中心、自由
  position?: "top" | "center" | "free";
  // 大小：小、中、大
  size?: "sm" | "md" | "lg";
}

export function LoadingIndicator({
  module,
  fixed = false,
  showLabel = true,
  label = "加载中...",
  position = "top",
  size = "md",
  className,
  ...props
}: LoadingIndicatorProps) {
  const { isAnyLoading, isModuleLoading, loading } = useLoading();
  
  // 确定是否显示加载指示器
  const isVisible = module 
    ? isModuleLoading(module) 
    : (loading.global || isAnyLoading());
  
  if (!isVisible) return null;
  
  // 根据大小确定图标尺寸
  const iconSize = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }[size];
  
  // 根据位置确定样式
  const positionStyles = {
    top: "top-0 left-0 right-0",
    center: "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
    free: "",
  }[position];
  
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fixed && "fixed z-50",
        positionStyles,
        fixed && position === "top" && "bg-background/80 backdrop-blur-sm py-2 shadow-md",
        className
      )}
      {...props}
    >
      <Loader2 className={cn("animate-spin text-primary", iconSize)} />
      {showLabel && (
        <span className={cn("ml-2 text-muted-foreground", size === "sm" && "text-xs", size === "lg" && "text-lg")}>
          {label}
        </span>
      )}
    </div>
  );
}

interface GlobalLoadingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  // 全局加载指示器的超时时间 (ms)，超过该时间才显示
  timeout?: number;
}

export function GlobalLoadingIndicator({ 
  timeout = 300,
  ...props 
}: GlobalLoadingIndicatorProps) {
  const { isAnyLoading } = useLoading();
  const [showLoading, setShowLoading] = React.useState(false);
  
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isAnyLoading()) {
      // 延迟显示加载指示器，避免闪烁
      timer = setTimeout(() => {
        setShowLoading(true);
      }, timeout);
    } else {
      setShowLoading(false);
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, [isAnyLoading, timeout]);
  
  if (!showLoading) return null;
  
  return (
    <LoadingIndicator
      fixed
      position="top"
      size="sm"
      className="py-1.5 px-4 justify-center bg-background/90 border-b"
      {...props}
    />
  );
}

interface ModuleLoadingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  // 模块名称
  module: string;
  // 加载时显示的文本
  label?: string;
}

export function ModuleLoadingIndicator({
  module,
  label,
  ...props
}: ModuleLoadingIndicatorProps) {
  return (
    <LoadingIndicator
      module={module}
      position="center"
      label={label}
      {...props}
    />
  );
} 