"use client"

import * as React from "react"
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Tag,
  Receipt,
  BarChart3,
  Settings,
  Store,
} from "lucide-react"

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Kasir', url: '/kasir', icon: ShoppingCart },
  { title: 'Produk', url: '/produk', icon: Package },
  { title: 'Kategori', url: '/kategori', icon: FolderTree },
  { title: 'Brand', url: '/brand', icon: Tag },
  { title: 'Transaksi', url: '/transaksi', icon: Receipt },
  { title: 'Laporan', url: '/laporan', icon: BarChart3 },
  { title: 'Pengaturan', url: '/settings', icon: Settings },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
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

  React.useEffect(() => {
    const idlePrefetch = () => {
      for (const item of navItems) {
        router.prefetch(item.url)
      }
    }

    const g = globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (typeof g.requestIdleCallback === 'function') {
      const id = g.requestIdleCallback(idlePrefetch, { timeout: 1200 })
      return () => g.cancelIdleCallback?.(id)
    }

    const t = setTimeout(idlePrefetch, 300)
    return () => clearTimeout(t)
  }, [router])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-3 border-b border-slate-200/80 bg-white">
        <div className="rounded-xl bg-gradient-to-b from-indigo-50/40 via-slate-50/20 to-white p-3.5 border border-slate-200/80 shadow-2xs flex flex-col items-center text-center">
          {/* Nama Toko */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600/70 mb-0.5">Toko</div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight w-full truncate" title={storeName}>
            {storeName}
          </h1>

          {/* Nama Aplikasi dengan Icon */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100/80 mt-2 shadow-2xs">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Store className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-bold text-indigo-700 tracking-tight">KasirQu</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          {/* Credit Developer */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 w-full flex items-center justify-between px-1 text-[11px]">
            <span className="text-slate-400 font-medium">Developed by</span>
            <span className="font-bold text-slate-800 hover:text-indigo-600 transition-colors">
              Najib Alfarizi
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        <nav className="flex flex-col py-3 px-2 space-y-1">
          {navItems.map((it) => {
            const Icon = it.icon
            const active = pathname === it.url || pathname.startsWith(it.url + '/')
            return (
              <Link
                key={it.url}
                href={it.url}
                prefetch
                onMouseEnter={() => router.prefetch(it.url)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                  active
                    ? 'bg-indigo-50/90 text-indigo-700 font-semibold border border-indigo-100/90 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                }`}
              >
                <span
                  className={`p-1.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 group-hover:text-slate-700 bg-slate-100/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-xs font-semibold tracking-tight">{it.title}</span>
              </Link>
            )
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200/80 bg-white p-3">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/80 border border-slate-200/60 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate leading-tight">Admin Toko</div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">admin@kasir.com</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
