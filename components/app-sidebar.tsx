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
  const [storeName, setStoreName] = React.useState('Loading...')

  // Load store name from settings
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        
        // Get store name from settings
        setStoreName(json['store.name'] || json['storeName'] || 'Toko Serbaguna')
      } catch (err) {
        console.error('Failed to load settings for sidebar', err)
        setStoreName('Toko Serbaguna')
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="px-4 py-4 border-b">
          <div className="space-y-1 text-center flex flex-col items-center">
            {/* Nama Toko */}
            <h1 className="text-lg font-bold text-slate-900">{storeName}</h1>
            
            {/* Nama Aplikasi - Hardcoded */}
            <div className="flex items-center gap-2 justify-center">
              <div className="w-6 h-6 rounded bg-sky-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-sky-700">KasirQu</span>
            </div>
            
            {/* Credit Developer - Hardcoded */}
            <div className="pt-2 border-t w-full">
              <p className="text-xs text-slate-500">Developed by</p>
              <p className="text-xs font-medium text-slate-700">Najib Alfarizi</p>
            </div>
          </div>
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
