"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { MoonStar, Sun, Monitor } from "lucide-react"
import { useState, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // 在组件加载后设置mounted为true，避免hydration不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="w-9 h-9 rounded-full">
        <span className="sr-only">切换主题</span>
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="w-9 h-9 rounded-full bg-background border-border hover:bg-accent hover:text-accent-foreground"
        >
          {theme === "light" && <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />}
          {theme === "dark" && <MoonStar className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />}
          {theme === "system" && <Monitor className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />}
          <span className="sr-only">切换主题</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-2">
        <div className="grid grid-cols-1 gap-2">
          <ThemeItem
            theme="light"
            icon={<Sun className="mr-2 h-4 w-4" />}
            label="浅色"
            currentTheme={theme}
            onClick={() => setTheme("light")}
          />
          <ThemeItem
            theme="dark"
            icon={<MoonStar className="mr-2 h-4 w-4" />}
            label="深色"
            currentTheme={theme}
            onClick={() => setTheme("dark")}
          />
          <ThemeItem
            theme="system"
            icon={<Monitor className="mr-2 h-4 w-4" />}
            label="系统"
            currentTheme={theme}
            onClick={() => setTheme("system")}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ThemeItemProps {
  theme: string
  icon: React.ReactNode
  label: string
  currentTheme?: string
  onClick: () => void
}

function ThemeItem({ theme, icon, label, currentTheme, onClick }: ThemeItemProps) {
  const isActive = currentTheme === theme
  
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start px-2 py-1.5 text-sm",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted hover:text-foreground"
      )}
      onClick={onClick}
    >
      <div className="flex items-center">
        {icon}
        <span>{label}</span>
        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto"
          >
            <Check className="h-4 w-4" />
          </motion.div>
        )}
      </div>
    </Button>
  )
} 