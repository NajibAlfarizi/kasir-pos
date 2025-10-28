"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import ModalProduk from "../components/ModalProduk"
import { toast } from "sonner"
  import ConfirmDialog from "@/components/ConfirmDialog"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

type Product = {
  id: number
  name: string
  price: number
  cost?: number
  stock: number
  category?: { id: number; name: string } | null
  brand?: { id: number; name: string } | null
}

export default function ProdukPage() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(false)
  const [openModal, setOpenModal] = React.useState(false)
  const [editing, setEditing] = React.useState<Product | null>(null)
  const [query, setQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [categories, setCategories] = React.useState<{ id: number; name: string }[]>([])
  const [brands, setBrands] = React.useState<{ id: number; name: string }[]>([])
  const [selectedCategory, setSelectedCategory] = React.useState<number | ''>('')
  const [selectedBrand, setSelectedBrand] = React.useState<number | ''>('')
  const [catFilter, setCatFilter] = React.useState('')
  const [brandFilter, setBrandFilter] = React.useState('')
  const [sortBy, setSortBy] = React.useState<string[]>(['name'])
  const [sortDir, setSortDir] = React.useState<Array<'asc' | 'desc'>>(['asc'])

  const handleSort = (col: string, e: React.MouseEvent) => {
    const isShift = e.shiftKey
    if (isShift) {
      // multi-column toggle/add
      setSortBy((prev) => {
        const idx = prev.indexOf(col)
        if (idx === -1) return [...prev, col]
          return prev // keep
        })
      setSortDir((prev) => {
        const idx = sortBy.indexOf(col)
        if (idx === -1) return [...prev, 'asc']
        // toggle existing
        return prev.map((d, i) => (i === idx ? (d === 'asc' ? 'desc' : 'asc') : d))
      })
    } else {
      // primary sort only
      if (sortBy[0] === col) {
        // toggle direction
        setSortDir(([d, ...rest]) => [(d === 'asc' ? 'desc' : 'asc'), ...rest])
      } else {
        setSortBy([col])
        setSortDir(['asc'])
      }
    }
    // reset to first page when sorting changes
    setPage(1)
  }

  const fetchProducts = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedQuery) params.set('q', debouncedQuery)
      if (selectedCategory !== '') params.set('categoryId', String(selectedCategory))
  if (selectedBrand !== '') params.set('brandId', String(selectedBrand))
      params.set('page', String(page))
      params.set('perPage', String(perPage))
      params.set('sortBy', sortBy.join(','))
      params.set('sortDir', sortDir.join(','))
      const res = await fetch(`/api/produk?${params.toString()}`)
      const json = await res.json()
      setProducts(json.data || [])
      setTotal(json.total || 0)
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat produk')
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, page, perPage, sortBy, sortDir, selectedCategory, selectedBrand])

  React.useEffect(() => { fetchProducts() }, [fetchProducts])

  // load categories for product filter
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/kategori')
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        const data = Array.isArray(json) ? json : (json?.data ?? [])
        setCategories(data)
      } catch (err) {
        console.error('load categories', err)
      }
    })()
    return () => { mounted = false }
  }, [])

  // load brands for product filter
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/brand')
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        const data = Array.isArray(json) ? json : (json?.data ?? [])
        setBrands(data)
      } catch (err) {
        console.error('load brands', err)
      }
    })()
    return () => { mounted = false }
  }, [])

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const onCreate = () => { setEditing(null); setOpenModal(true) }
  const onEdit = (p: Product) => { setEditing(p); setOpenModal(true) }

  const onDelete = async (id: number) => {
    const res = await fetch(`/api/produk?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error || 'Terjadi kesalahan saat menghapus')
      return
    }
    toast.success('Produk dihapus')
    fetchProducts()
  }

  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmTargetId, setConfirmTargetId] = React.useState<number | null>(null)
  const openDeleteConfirm = (id: number) => { setConfirmTargetId(id); setConfirmOpen(true) }
  const handleConfirmDelete = async () => {
    if (confirmTargetId == null) return
    await onDelete(confirmTargetId)
    setConfirmTargetId(null)
  }

  const filtered = products // server-side filtered already

  const totalPages = Math.max(1, Math.ceil(total / perPage))


  const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <div className="text-sm text-muted-foreground mb-1">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Produk</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">Manajemen Produk</h1>
            <p className="mt-2 text-sm text-slate-500">Kelola produk, harga, dan stok Anda di sini.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-50 rounded-md px-3 py-2">
                <Input placeholder="Cari produk..." className="w-64 bg-transparent" value={query} onChange={(e) => setQuery(e.target.value)} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white text-sm hover:shadow-sm">
                      <span className="font-medium">{selectedCategory === '' ? 'Semua Kategori' : (categories.find(c => c.id === selectedCategory)?.name ?? 'Kategori')}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="max-w-xs">
                    <div className="px-2 py-1">
                      <input value={catFilter} onChange={(e) => setCatFilter(e.target.value)} placeholder="Cari kategori..." className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="max-h-56 overflow-auto">
                      {categories.filter(c => c.name.toLowerCase().includes(catFilter.toLowerCase())).map(cat => (
                        <DropdownMenuItem key={cat.id} onSelect={() => { setSelectedCategory(cat.id); setCatFilter(''); setPage(1) }}>
                          <div className="flex items-center justify-between w-full">
                            <span>{cat.name}</span>
                            {selectedCategory === cat.id ? <span className="text-sky-600">✓</span> : null}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                    <DropdownMenuItem onSelect={() => { setSelectedCategory(''); setCatFilter(''); setPage(1) }}>
                      Semua Kategori
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                  <div className="ml-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white text-sm hover:shadow-sm">
                          <span className="font-medium">{selectedBrand === '' ? 'Semua Brand' : (brands.find(b => b.id === selectedBrand)?.name ?? 'Brand')}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="max-w-xs">
                        <div className="px-2 py-1">
                          <input value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} placeholder="Cari brand..." className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                        <div className="max-h-56 overflow-auto">
                          {brands.filter(b => b.name.toLowerCase().includes(brandFilter.toLowerCase())).map(b => (
                            <DropdownMenuItem key={b.id} onSelect={() => { setSelectedBrand(b.id); setBrandFilter(''); setPage(1) }}>
                              <div className="flex items-center justify-between w-full">
                                <span>{b.name}</span>
                                {selectedBrand === b.id ? <span className="text-sky-600">✓</span> : null}
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </div>
                        <DropdownMenuItem onSelect={() => { setSelectedBrand(''); setBrandFilter(''); setPage(1) }}>
                          Semua Brand
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
            </div>
            <Button variant="default" onClick={onCreate} className="bg-sky-600 text-white hover:bg-sky-700">Buat Produk</Button>
          </div>
        </div>
        <Separator />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-3 border-b bg-gradient-to-r from-white via-slate-50 to-white">
          <div className="text-sm text-slate-600">Daftar produk yang tersedia</div>
        </div>
        <div className="p-2">
          {loading ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2"><Spinner /> Memuat produk...</div>
              <div className="grid grid-cols-12 gap-4 items-center py-3">
                <Skeleton className="col-span-1 h-6" />
                <Skeleton className="col-span-4 h-6" />
                <Skeleton className="col-span-3 h-6" />
                <Skeleton className="col-span-2 h-6" />
                <Skeleton className="col-span-2 h-6" />
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-full table-fixed text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead className="cursor-pointer" onClick={(e) => handleSort('name', e)}>Nama</TableHead>
                    <TableHead className="w-28 text-right">Harga</TableHead>
                    <TableHead className="w-28 text-right">Harga Modal</TableHead>
                    <TableHead className="w-20">Stok</TableHead>
                    <TableHead className="w-28 hidden md:table-cell">Kategori</TableHead>
                    <TableHead className="w-28 hidden md:table-cell">Brand</TableHead>
                    <TableHead className="w-28 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p, idx) => (
                    <TableRow key={p.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'}>
                      <TableCell className="px-2 py-2">{p.id}</TableCell>
                      <TableCell className="font-medium text-slate-800 truncate max-w-[220px]">{p.name}</TableCell>
                      <TableCell className="text-emerald-600 font-semibold text-right pr-2">{fmt.format(p.price)}</TableCell>
                      <TableCell className="text-slate-600 text-right pr-2">{typeof p.cost === 'number' ? fmt.format(p.cost) : '-'}</TableCell>
                      <TableCell className="px-2">
                        {p.stock <= 5 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{p.stock}</span>
                        ) : p.stock <= 10 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{p.stock}</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{p.stock}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {p.category ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 truncate max-w-[140px]">{p.category.name}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {p.brand ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 truncate max-w-[140px]">{p.brand.name}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(p)} className="text-sky-600 hover:bg-sky-50 px-2 py-1">Edit</Button>
                          <Button variant="link" size="sm" onClick={() => openDeleteConfirm(p.id)} className="text-red-600 hover:bg-red-50 px-2 py-1">Hapus</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Tidak ada produk</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">Menampilkan {products.length} dari {total} produk</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
                  <div className="px-2">Halaman {page} / {totalPages}</div>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                  <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="border px-2 py-1 rounded">
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ModalProduk
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSaved={() => { setOpenModal(false); fetchProducts() }}
        editing={editing}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus produk"
        description="Apakah Anda yakin ingin menghapus produk ini?"
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleConfirmDelete}
        onClose={() => { setConfirmTargetId(null); setConfirmOpen(false) }}
      />
    </div>
  )
}