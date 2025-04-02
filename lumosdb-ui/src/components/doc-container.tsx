"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface DocContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function DocContainer({ children, className }: DocContainerProps) {
  return (
    <div className={cn("max-w-4xl mx-auto p-6", className)}>
      {children}
    </div>
  )
} 