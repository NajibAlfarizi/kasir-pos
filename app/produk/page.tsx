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
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown,
  Check,
} from "lucide-react"

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
    const t = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1) // Reset to first page when search query changes
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1)
  }, [selectedCategory, selectedBrand])

  const onCreate = () => { setEditing(null); setOpenModal(true) }
  const onEdit = (p: Product) => { setEditing(p); setOpenModal(true) }

  const onSavedProduct = (savedData: unknown) => {
    const newProduct = savedData as Product
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === newProduct.id)
      if (idx >= 0) {
        // Update existing product
        const updated = [...prev]
        updated[idx] = newProduct
        return updated
      } else {
        // Add new product
        return [newProduct, ...prev]
      }
    })
    setOpenModal(false)
    setEditing(null)
  }

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


  const fmt = React.useMemo(() => ({
    format: (v: number) => {
      const num = Math.round(Number(v) || 0)
      return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
  }), [])

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                <Package className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                Manajemen Produk
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Kelola master data produk, harga jual, harga modal (HPP), dan stok minimarket
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={onCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 shadow-2xs transition-all"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Produk
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari produk atau barcode..."
                className="w-64 pl-9 h-9 text-xs border-slate-300"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs">
                  <span>{selectedCategory === '' ? 'Semua Kategori' : (categories.find(c => c.id === selectedCategory)?.name ?? 'Kategori')}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-w-xs">
                <div className="px-2 py-1">
                  <input
                    value={catFilter}
                    onChange={(e) => setCatFilter(e.target.value)}
                    placeholder="Cari kategori..."
                    className="w-full border rounded px-2 py-1 text-xs"
                  />
                </div>
                <div className="max-h-56 overflow-auto">
                  {categories.filter(c => c.name.toLowerCase().includes(catFilter.toLowerCase())).map(cat => (
                    <DropdownMenuItem key={cat.id} onSelect={() => { setSelectedCategory(cat.id); setCatFilter(''); setPage(1) }}>
                      <div className="flex items-center justify-between w-full text-xs">
                        <span>{cat.name}</span>
                        {selectedCategory === cat.id ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : null}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuItem onSelect={() => { setSelectedCategory(''); setCatFilter(''); setPage(1) }} className="text-xs">
                  Semua Kategori
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs">
                  <span>{selectedBrand === '' ? 'Semua Brand' : (brands.find(b => b.id === selectedBrand)?.name ?? 'Brand')}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-w-xs">
                <div className="px-2 py-1">
                  <input
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    placeholder="Cari brand..."
                    className="w-full border rounded px-2 py-1 text-xs"
                  />
                </div>
                <div className="max-h-56 overflow-auto">
                  {brands.filter(b => b.name.toLowerCase().includes(brandFilter.toLowerCase())).map(b => (
                    <DropdownMenuItem key={b.id} onSelect={() => { setSelectedBrand(b.id); setBrandFilter(''); setPage(1) }}>
                      <div className="flex items-center justify-between w-full text-xs">
                        <span>{b.name}</span>
                        {selectedBrand === b.id ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : null}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuItem onSelect={() => { setSelectedBrand(''); setBrandFilter(''); setPage(1) }} className="text-xs">
                  Semua Brand
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="text-xs font-medium text-slate-500">
            Total {total} produk terdaftar
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Daftar Produk</div>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Spinner className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-500">Memuat data produk...</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table className="min-w-full table-fixed text-sm">
                    <TableHeader>
                      <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                        <TableHead className="w-14 font-semibold text-slate-600">ID</TableHead>
                        <TableHead className="cursor-pointer font-semibold text-slate-600" onClick={(e) => handleSort('name', e)}>
                          Nama Produk
                        </TableHead>
                        <TableHead className="w-32 text-right font-semibold text-slate-600">Harga Jual</TableHead>
                        <TableHead className="w-32 text-right font-semibold text-slate-600">Harga Modal</TableHead>
                        <TableHead className="w-24 font-semibold text-slate-600">Stok</TableHead>
                        <TableHead className="w-32 hidden md:table-cell font-semibold text-slate-600">Kategori</TableHead>
                        <TableHead className="w-32 hidden md:table-cell font-semibold text-slate-600">Brand</TableHead>
                        <TableHead className="w-36 text-right font-semibold text-slate-600">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p, idx) => (
                        <TableRow key={p.id} className="align-middle hover:bg-slate-50/50 transition-colors">
                          <TableCell className="px-3 py-3 font-medium text-slate-400 text-xs">#{p.id}</TableCell>
                          <TableCell className="font-semibold text-slate-800 truncate max-w-[220px]">{p.name}</TableCell>
                          <TableCell className="text-slate-900 font-bold text-right pr-2">{fmt.format(p.price)}</TableCell>
                          <TableCell className="text-slate-500 text-right pr-2">{typeof p.cost === 'number' ? fmt.format(p.cost) : '-'}</TableCell>
                          <TableCell className="px-2">
                            {p.stock <= 5 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">{p.stock} pcs</span>
                            ) : p.stock <= 10 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">{p.stock} pcs</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{p.stock} pcs</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {p.category ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 truncate max-w-[140px]">{p.category.name}</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {p.brand ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 truncate max-w-[140px]">{p.brand.name}</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(p)}
                                className="h-7 px-2.5 text-xs text-indigo-600 hover:text-indigo-800 border-slate-200"
                              >
                                <Pencil className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteConfirm(p.id)}
                                className="h-7 px-2.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Hapus
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            Tidak ada produk ditemukan
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 px-2 bg-slate-50/30">
                  <div className="text-xs text-slate-500">Menampilkan {products.length} dari {total} produk</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="h-8 px-2.5 text-xs border-slate-200 bg-white"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                      Sebelumnya
                    </Button>
                    <div className="text-xs font-medium text-slate-700 px-2">Halaman {page} dari {totalPages}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="h-8 px-2.5 text-xs border-slate-200 bg-white"
                    >
                      Selanjutnya
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                    <select
                      value={perPage}
                      onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                      className="border border-slate-300 bg-white h-8 px-2 rounded-md text-xs font-medium text-slate-700"
                    >
                      <option value={10}>10 / hal</option>
                      <option value={20}>20 / hal</option>
                      <option value={50}>50 / hal</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ModalProduk
        open={openModal}
        onClose={() => { setOpenModal(false); setEditing(null) }}
        onSaved={onSavedProduct}
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