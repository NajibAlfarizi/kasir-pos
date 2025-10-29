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
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Manajemen Brand</h1>
          <p className="text-sm text-slate-500">Tambah dan kelola brand produk.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Tambah / Kelola Brand</h2>
            <p className="text-sm text-slate-500">Gunakan modal untuk membuat atau mengedit brand.</p>
          </div>
          <div className="flex items-center gap-3">
            <Input placeholder="Cari brand..." className="w-64 bg-white" value={query} onChange={(e) => setQuery(e.target.value)} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-white shadow-sm text-sm hover:shadow-md">
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
                    <DropdownMenuItem key={cat.id} onSelect={() => { setSelectedCategory(cat.id); setCatFilter('') }}>
                      <div className="flex items-center justify-between w-full">
                        <span>{cat.name}</span>
                        {selectedCategory === cat.id ? <span className="text-sky-600">✓</span> : null}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuItem onSelect={() => { setSelectedCategory(''); setCatFilter('') }}>
                  Semua Kategori
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {loading ? <span className="text-sm text-slate-500">Memuat...</span> : null}
            <Button onClick={openCreate} className="bg-sky-600 text-white" disabled={loading}>Buat Brand</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="w-28 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="px-2 py-2">{b.id}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.category?.name ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>Edit</Button>
                      <Button variant="link" size="sm" onClick={() => openDeleteConfirm(b.id)} className="text-red-600">Hapus</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {brands.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Belum ada brand</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">Menampilkan {brands.length} dari {total} brand</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
          <div className="px-2">Halaman {page} / {Math.max(1, Math.ceil(total / perPage))}</div>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(total / perPage)), p + 1))} disabled={page >= Math.max(1, Math.ceil(total / perPage))}>Next</Button>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="border px-2 py-1 rounded">
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>
      <ModalBrand open={modalOpen} onOpenChange={(v) => setModalOpen(v)} editing={modalEditing} onSaved={() => { fetchBrands(); setModalOpen(false) }} />
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus brand"
        description="Apakah Anda yakin ingin menghapus brand ini?"
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleConfirmDelete}
        onClose={() => { setConfirmTargetId(null); setConfirmOpen(false) }}
      />
    </div>
  )
}
