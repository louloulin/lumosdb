"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

interface MobileDrawerProps {
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export function MobileDrawer({ items }: MobileDrawerProps) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  // 避免水和错误
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 在移动设备上才显示抽屉菜单
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    
    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  if (!isMounted || !isMobile) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden fixed top-4 left-4 z-50">
          <Menu className="h-5 w-5" />
          <span className="sr-only">打开导航菜单</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <ScrollArea className="h-full py-6">
          <div className="px-4 py-2">
            <h2 className="text-lg font-bold">LumosDB</h2>
            <p className="text-sm text-muted-foreground">移动端导航</p>
          </div>
          <nav className="grid gap-1 px-2 group">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 group-hover:opacity-70 transition-colors",
                    pathname === item.href
                      ? "bg-accent text-accent-foreground opacity-100"
                      : "opacity-80 hover:opacity-100 hover:bg-accent/50"
                  )}
                >
                  <Icon className={cn("h-5 w-5", pathname === item.href ? "opacity-100" : "opacity-80")} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
} 