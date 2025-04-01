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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();

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
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="flex flex-col h-full">
          <div className="flex h-14 items-center px-4 border-b">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">LumosDB</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid gap-1 px-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
              <li>
                <Link href="/dashboard/profile">
                  <svg
                    className={`h-5 w-5 ${pathname === '/dashboard/profile' ? 'text-primary' : 'text-muted-foreground'}`}
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>个人中心</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard/import-export">
                  <svg
                    className={`h-5 w-5 ${pathname === '/dashboard/import-export' ? 'text-primary' : 'text-muted-foreground'}`}
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2v8" />
                    <path d="m16 6-4-4-4 4" />
                    <path d="M8 10H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-4" />
                    <path d="M12 22v-8" />
                    <path d="m8 18 4 4 4-4" />
                  </svg>
                  <span>数据导入导出</span>
                </Link>
              </li>
            </nav>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <MoonStar className="h-5 w-5" />
                )}
              </Button>
              <Button variant="ghost" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">
              {navigation.find((item) => item.href === pathname)?.name || "Dashboard"}
            </h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
} 