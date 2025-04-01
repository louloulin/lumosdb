"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import {
  DatabaseIcon,
  LayoutDashboard,
  Table2,
  BoxSelect,
  Settings,
  LogOut,
  MoonStar,
  Sun,
  Code,
  BarChart4,
  ActivitySquare,
  RefreshCw,
  Palette,
  Globe,
} from "lucide-react";
import { useTheme } from "next-themes";
import { MobileDrawer } from "@/components/mobile/mobile-drawer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "SQL Editor",
      href: "/dashboard/sql-editor",
      icon: Code,
    },
    {
      name: "SQLite Tables",
      href: "/dashboard/sqlite",
      icon: Table2,
    },
    {
      name: "DuckDB Analytics",
      href: "/dashboard/duckdb",
      icon: DatabaseIcon,
    },
    {
      name: "Vector Collections",
      href: "/dashboard/vectors",
      icon: BoxSelect,
    },
    {
      name: "Analytics Dashboard",
      href: "/dashboard/analytics",
      icon: BarChart4,
    },
    {
      name: "System Monitoring",
      href: "/dashboard/monitoring",
      icon: ActivitySquare,
    },
    {
      name: "Realtime Data",
      href: "/dashboard/realtime",
      icon: RefreshCw,
    },
    {
      name: "Theme Settings",
      href: "/dashboard/theme",
      icon: Palette,
    },
    {
      name: "Language Settings",
      href: "/dashboard/language",
      icon: Globe,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="relative min-h-screen">
      {/* 添加移动端抽屉导航 */}
      <MobileDrawer items={navigation} />
      
      <div className="flex min-h-screen">
        {/* 桌面端侧边栏导航 - 在移动设备上隐藏 */}
        <aside className="hidden md:flex h-screen w-64 flex-col fixed inset-y-0 z-10">
          <div className="flex flex-col flex-grow border-r bg-background px-5 py-5">
            <div className="flex items-center mb-6">
              <div className="inline-flex items-center gap-2">
                <DatabaseIcon className="h-6 w-6 text-primary" />
                <span className="text-xl font-semibold">LumosDB</span>
              </div>
            </div>
            <nav className="flex-1 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-4">
              <div className="space-y-1">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-full flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="mr-3 h-5 w-5" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <MoonStar className="mr-3 h-5 w-5" />
                      Dark Mode
                    </>
                  )}
                </button>
                <button className="w-full flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  <LogOut className="mr-3 h-5 w-5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </aside>
        
        {/* 主内容区域 - 在移动设备上全宽显示 */}
        <main className="flex-1 md:pl-64">
          <div className="px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 