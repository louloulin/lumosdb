"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface DocWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function DocWrapper({ children, className }: DocWrapperProps) {
  return (
    <div className={cn("max-w-4xl mx-auto p-6", className)}>
      {children}
    </div>
  )
} 