"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import ModalBrand from '../components/ModalBrand'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Tag, Plus, Search, Pencil, Trash2, ChevronDown, ChevronLeft, ChevronRight, Check, RotateCw } from 'lucide-react'

type Brand = { id: number; name: string; category?: { id: number; name: string } | null }

export default function BrandPage() {
  const [brands, setBrands] = React.useState<Brand[]>([])
  const [modalOpen, setModalOpen] = React.useState(false)
  const [modalEditing, setModalEditing] = React.useState<Brand | null>(null)
  const [categories, setCategories] = React.useState<{ id: number; name: string }[]>([])
  const [selectedCategory, setSelectedCategory] = React.useState<number | ''>('')
  const [catFilter, setCatFilter] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(false)

  const fetchBrands = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== '') params.set('categoryId', String(selectedCategory))
      if (debouncedQuery) params.set('q', debouncedQuery)
      if (page) params.set('page', String(page))
      if (perPage) params.set('perPage', String(perPage))
      const res = await fetch(`/api/brand?${params.toString()}`)
      const json = await res.json()
      // API returns { data, total, page, perPage }
      const data = Array.isArray(json) ? json : (json?.data ?? [])
      setBrands(data)
      setTotal(json?.total ?? data.length)
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat brand')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, debouncedQuery, page, perPage])

  React.useEffect(() => { fetchBrands() }, [fetchBrands])

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // reset to first page when filters/search changes
  React.useEffect(() => { setPage(1) }, [selectedCategory, debouncedQuery, perPage])

  // load categories for filter
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

  const openCreate = () => { setModalEditing(null); setModalOpen(true) }
  const openEdit = (b: Brand) => { setModalEditing(b); setModalOpen(true) }
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmTargetId, setConfirmTargetId] = React.useState<number | null>(null)

  const openDeleteConfirm = (id: number) => { setConfirmTargetId(id); setConfirmOpen(true) }

  const handleConfirmDelete = async () => {
    if (confirmTargetId == null) return
    try {
      const res = await fetch(`/api/brand?id=${confirmTargetId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json?.error || 'Gagal menghapus')
      } else {
        toast.success('Brand dihapus')
        fetchBrands()
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghapus brand')
    } finally {
      setConfirmTargetId(null)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-slate-700">Brand</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen Brand</h1>
              <p className="text-xs text-slate-500">Kelola merk/brand produk untuk kemudahan identifikasi barang.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBrands}
            disabled={loading}
            className="rounded-lg h-9 border-slate-200 text-slate-600 hover:text-slate-900"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={openCreate}
            className="rounded-lg h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-medium"
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Buat Brand
          </Button>
        </div>
      </div>

      {/* Table & Filter Container */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Cari brand..."
                className="pl-9 h-9 bg-white border-slate-200 rounded-lg text-sm focus-visible:ring-indigo-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors h-9">
                  <span>{selectedCategory === '' ? 'Semua Kategori' : (categories.find(c => c.id === selectedCategory)?.name ?? 'Kategori')}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56 p-1 rounded-xl shadow-lg border-slate-200">
                <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                  <input
                    value={catFilter}
                    onChange={(e) => setCatFilter(e.target.value)}
                    placeholder="Cari kategori..."
                    className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div className="max-h-56 overflow-auto">
                  <DropdownMenuItem
                    onSelect={() => { setSelectedCategory(''); setCatFilter('') }}
                    className="text-xs font-medium rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>Semua Kategori</span>
                      {selectedCategory === '' ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : null}
                    </div>
                  </DropdownMenuItem>
                  {categories.filter(c => c.name.toLowerCase().includes(catFilter.toLowerCase())).map(cat => (
                    <DropdownMenuItem
                      key={cat.id}
                      onSelect={() => { setSelectedCategory(cat.id); setCatFilter('') }}
                      className="text-xs rounded-lg cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{cat.name}</span>
                        {selectedCategory === cat.id ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : null}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="text-xs text-slate-500">
            Total <span className="font-semibold text-slate-800">{total}</span> brand terdaftar
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 border-b border-slate-200 hover:bg-slate-50/70">
                <TableHead className="w-16 font-semibold text-slate-700 text-xs">ID</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs">NAMA BRAND</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs">KATEGORI</TableHead>
                <TableHead className="w-28 text-right font-semibold text-slate-700 text-xs">AKSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map(b => (
                <TableRow key={b.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="font-mono text-xs text-slate-500">#{b.id}</TableCell>
                  <TableCell className="font-semibold text-slate-900 text-sm">{b.name}</TableCell>
                  <TableCell>
                    {b.category ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {b.category.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(b)}
                        className="h-8 px-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteConfirm(b.id)}
                        className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {brands.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                    <Tag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">Belum ada brand ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau buat brand baru</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination bar */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/30">
          <div className="text-xs text-slate-500">
            Menampilkan <span className="font-semibold text-slate-700">{brands.length}</span> dari <span className="font-semibold text-slate-700">{total}</span> brand
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 px-2.5 rounded-lg border-slate-200 text-xs font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Prev
            </Button>
            <div className="text-xs font-medium text-slate-700 px-1">
              Halaman {page} dari {Math.max(1, Math.ceil(total / perPage))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(total / perPage)), p + 1))}
              disabled={page >= Math.max(1, Math.ceil(total / perPage))}
              className="h-8 px-2.5 rounded-lg border-slate-200 text-xs font-medium"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
              className="border border-slate-200 px-2 py-1 rounded-lg text-xs bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500 h-8 ml-1"
            >
              <option value={5}>5 / hal</option>
              <option value={10}>10 / hal</option>
              <option value={20}>20 / hal</option>
            </select>
          </div>
        </div>
      </div>

      <ModalBrand
        open={modalOpen}
        onOpenChange={(v) => setModalOpen(v)}
        editing={modalEditing}
        onSaved={() => { fetchBrands(); setModalOpen(false) }}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus Brand"
        description="Apakah Anda yakin ingin menghapus brand ini? Produk yang terkait mungkin terpengaruh."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleConfirmDelete}
        onClose={() => { setConfirmTargetId(null); setConfirmOpen(false) }}
      />
    </div>
  )
}
