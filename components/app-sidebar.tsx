"use client"

import * as React from "react"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot,
  GalleryVerticalEnd,
  BookOpen,
  PieChart,
  Settings2,
  SquareTerminal,
  Tag,
} from "lucide-react"

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: SquareTerminal },
  { title: 'Kasir', url: '/kasir', icon: Bot },
  { title: 'Produk', url: '/produk', icon: GalleryVerticalEnd },
  { title: 'Kategori', url: '/kategori', icon: BookOpen },
  { title: 'Brand', url: '/brand', icon: Tag },
  { title: 'Transaksi', url: '/transaksi', icon: PieChart },
  { title: 'Pengaturan', url: '/settings', icon: Settings2 },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname() || '/'

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="px-4 py-3">
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">KasirQu</Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <nav className="flex flex-col py-2">
          {navItems.map((it) => {
            const Icon = it.icon
            const active = pathname === it.url || pathname.startsWith(it.url + '/')
            return (
              <Link key={it.url} href={it.url} className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg mb-1 transition-colors ${active ? 'bg-sky-50 text-sky-700 shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span className={`p-1 rounded-md ${active ? 'bg-sky-100 text-sky-600' : 'text-slate-500'}`}><Icon className="w-5 h-5" /></span>
                <span className="text-sm font-medium">{it.title}</span>
              </Link>
            )
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 flex items-center justify-center text-white font-semibold shadow">A</div>
            <div>
              <div className="text-sm font-medium">Admin</div>
              <div className="text-xs text-slate-500">admin@kasir.com</div>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
