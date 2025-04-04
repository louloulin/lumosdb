"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { MoonStar, Sun, Monitor } from "lucide-react"
import { useState, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
// @ts-ignore
import { motion } from "framer-motion"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isChanging, setIsChanging] = useState(false)

  // 在组件加载后设置mounted为true，避免hydration不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  // 主题变化时添加动画
  const handleThemeChange = (newTheme: string) => {
    setIsChanging(true)
    setTheme(newTheme)
    setTimeout(() => setIsChanging(false), 300)
  }

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm">
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
          className={cn(
            "w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border-border hover:bg-accent hover:text-accent-foreground theme-switch-button",
            isChanging && "animate-pulse"
          )}
        >
          {/* @ts-ignore */}
          <motion.div
            key={theme}
            initial={{ rotate: -30, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 30, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {theme === "light" && <Sun className="h-[1.2rem] w-[1.2rem]" />}
            {theme === "dark" && <MoonStar className="h-[1.2rem] w-[1.2rem]" />}
            {theme === "system" && <Monitor className="h-[1.2rem] w-[1.2rem]" />}
          </motion.div>
          <span className="sr-only">切换主题</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-2 theme-transition-bg">
        <div className="grid grid-cols-1 gap-2">
          <ThemeItem
            theme="light"
            icon={<Sun className="mr-2 h-4 w-4" />}
            label="浅色"
            currentTheme={theme}
            onClick={() => handleThemeChange("light")}
            index={0}
          />
          <ThemeItem
            theme="dark"
            icon={<MoonStar className="mr-2 h-4 w-4" />}
            label="深色"
            currentTheme={theme}
            onClick={() => handleThemeChange("dark")}
            index={1}
          />
          <ThemeItem
            theme="system"
            icon={<Monitor className="mr-2 h-4 w-4" />}
            label="系统"
            currentTheme={theme}
            onClick={() => handleThemeChange("system")}
            index={2}
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
  index: number
}

function ThemeItem({ theme, icon, label, currentTheme, onClick, index }: ThemeItemProps) {
  const isActive = currentTheme === theme
  
  return (
    // @ts-ignore
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="theme-switcher-item"
    >
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start px-2 py-1.5 text-sm",
          isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted hover:text-foreground"
        )}
        onClick={onClick}
      >
        <div className="flex items-center w-full">
          {icon}
          <span>{label}</span>
          {isActive && (
            // @ts-ignore
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
    </motion.div>
  )
} 