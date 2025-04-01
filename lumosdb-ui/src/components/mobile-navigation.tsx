"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Menu, 
  Database, 
  Grid3X3, 
  BarChart4, 
  User, 
  Settings, 
  X,
  Home,
  Table,
  Search,
  Activity,
  ChevronRight,
  FileCode
} from "lucide-react"
import { MobileOnly } from "./responsive-container"

interface MobileNavProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Touch-friendly mobile navigation bar that appears at the bottom of the screen
 * on mobile devices
 */
export function MobileNavigation({ className, ...props }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close the navigation drawer when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navItems = [
    {
      title: "仪表盘",
      href: "/dashboard",
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: "SQLite",
      href: "/dashboard/sqlite",
      icon: <Database className="h-5 w-5" />,
      submenu: [
        {
          title: "表管理",
          href: "/dashboard/sqlite",
          icon: <Table className="h-4 w-4" />,
        },
        {
          title: "SQL 编辑器",
          href: "/dashboard/sql-editor",
          icon: <FileCode className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "向量数据",
      href: "/dashboard/vectors",
      icon: <Grid3X3 className="h-5 w-5" />,
      submenu: [
        {
          title: "集合",
          href: "/dashboard/vectors",
          icon: <Grid3X3 className="h-4 w-4" />,
        },
        {
          title: "向量搜索",
          href: "/dashboard/vectors/search",
          icon: <Search className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "分析",
      href: "/dashboard/analytics",
      icon: <BarChart4 className="h-5 w-5" />,
    },
    {
      title: "实时数据",
      href: "/dashboard/realtime",
      icon: <Activity className="h-5 w-5" />,
    },
    {
      title: "设置",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      title: "个人资料",
      href: "/dashboard/profile",
      icon: <User className="h-5 w-5" />,
    },
  ];

  return (
    <MobileOnly>
      <div className={cn("fixed bottom-0 left-0 right-0 z-50", className)} {...props}>
        {/* Bottom tab bar */}
        <div className="h-16 bg-background border-t flex items-center justify-around px-2">
          {navItems.slice(0, 4).map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full",
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span className="text-[10px] mt-1">{item.title}</span>
            </Link>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="flex flex-col items-center justify-center w-16 h-full rounded-none"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] mt-1">菜单</span>
          </Button>
        </div>

        {/* Drawer overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Drawer content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 h-[80vh] bg-background border-t rounded-t-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold">导航菜单</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <ScrollArea className="h-[calc(80vh-60px)]">
                <div className="p-4 space-y-6">
                  {navItems.map((item) => (
                    <div key={item.href} className="space-y-2">
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 bg-muted/50 rounded-md",
                          pathname === item.href && "bg-primary/10 text-primary"
                        )}
                      >
                        <div className="flex items-center">
                          {item.icon}
                          <span className="ml-3 font-medium">{item.title}</span>
                        </div>
                        {item.submenu && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </Link>
                      
                      {item.submenu && (
                        <div className="ml-8 space-y-1">
                          {item.submenu.map((subitem) => (
                            <Link
                              key={subitem.href}
                              href={subitem.href}
                              className={cn(
                                "flex items-center px-4 py-2 rounded-md",
                                pathname === subitem.href && "bg-primary/10 text-primary"
                              )}
                            >
                              {subitem.icon}
                              <span className="ml-3">{subitem.title}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileOnly>
  );
} 