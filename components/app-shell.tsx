"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { NavBar } from "@/components/nav-bar"
import { Toaster } from "@/components/ui/sonner"

type AppShellProps = {
  children: React.ReactNode
}

const AUTH_ROUTES = ["/login", "/register"]

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() || "/"
  const isAuthPage = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  if (isAuthPage) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <SidebarProvider>
      <NavBar />
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 p-6 sm:p-10">{children}</main>
        <Toaster />
      </div>
    </SidebarProvider>
  )
}
