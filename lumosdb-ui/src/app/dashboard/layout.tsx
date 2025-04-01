"use client";

import { SideNav } from "@/components/side-nav"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { UserButton } from "@/components/user-button"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs"
import { AuthProvider } from "@/contexts/auth-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const breadcrumbs = useBreadcrumbs()

  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <SideNav />
        
        <div className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <Breadcrumbs items={breadcrumbs} />
            <div className="ml-auto flex items-center gap-4">
              <ThemeSwitcher />
              <UserButton />
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  )
} 