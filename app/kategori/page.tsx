"use client"

import * as React from "react"
import { toast } from 'sonner'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { FolderTree, Plus, Search, Pencil, Trash2, RotateCw } from "lucide-react"

import ModalKategori from "../components/ModalKategori"
import ConfirmDialog from "@/components/ConfirmDialog"

type Category = {
  id: number
  name: string
  description?: string | null
}

export default function KategoriPage() {
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(false)
  const [openModal, setOpenModal] = React.useState(false)
  const [editing, setEditing] = React.useState<Category | null>(null)
  const [query, setQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const fetchCategories = async () => {
    setLoading(true)
    const res = await fetch('/api/kategori')
    const payload = await res.json()
    const nextCategories = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : []
    setCategories(nextCategories)
    setLoading(false)
  }

  React.useEffect(() => {
    fetchCategories()
  }, [])

  const onCreate = () => {
    setEditing(null)
    setOpenModal(true)
  }

  const onEdit = (cat: Category) => {
    setEditing(cat)
    setOpenModal(true)
  }

  const onDelete = async (id: number) => {
    // keep for compatibility; prefer dialog flow
    const res = await fetch(`/api/kategori?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error || 'Terjadi kesalahan saat menghapus')
      return
    }
    toast.success('Kategori dihapus')
    fetchCategories()
  }

  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmTargetId, setConfirmTargetId] = React.useState<number | null>(null)
  const openDeleteConfirm = (id: number) => { setConfirmTargetId(id); setConfirmOpen(true) }
  const handleConfirmDelete = async () => {
    if (confirmTargetId == null) return
    await onDelete(confirmTargetId)
    setConfirmTargetId(null)
  }

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(debouncedQuery.toLowerCase()))
  )

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
                  <BreadcrumbPage className="font-semibold text-slate-700">Kategori</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen Kategori</h1>
              <p className="text-xs text-slate-500">Kelola kategori produk untuk pengelompokan yang rapi dan terstruktur.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCategories}
            disabled={loading}
            className="rounded-lg h-9 border-slate-200 text-slate-600 hover:text-slate-900"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={onCreate}
            className="rounded-lg h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Buat Kategori
          </Button>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Cari kategori..."
              className="pl-9 h-9 bg-white border-slate-200 rounded-lg text-sm focus-visible:ring-indigo-500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="text-xs text-slate-500">
            Total <span className="font-semibold text-slate-800">{filteredCategories.length}</span> kategori
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner /> Memuat kategori...
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 border-b border-slate-200 hover:bg-slate-50/70">
                  <TableHead className="w-16 font-semibold text-slate-700 text-xs">ID</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">NAMA KATEGORI</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-xs">DESKRIPSI</TableHead>
                  <TableHead className="w-28 text-right font-semibold text-slate-700 text-xs">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="font-mono text-xs text-slate-500">#{c.id}</TableCell>
                    <TableCell className="font-semibold text-slate-900 text-sm">{c.name}</TableCell>
                    <TableCell className="text-sm text-slate-600">{c.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(c)}
                          className="h-8 px-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteConfirm(c.id)}
                          className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCategories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                      <FolderTree className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-600">Tidak ada kategori ditemukan</p>
                      <p className="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau buat kategori baru</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <ModalKategori
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSaved={() => {
          setOpenModal(false)
          fetchCategories()
        }}
        editing={editing}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus kategori"
        description="Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleConfirmDelete}
        onClose={() => { setConfirmTargetId(null); setConfirmOpen(false) }}
      />
    </div>
  )
}