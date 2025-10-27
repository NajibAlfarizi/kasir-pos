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
    const data = await res.json()
    setCategories(data)
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

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
          <div className="flex flex-col">
            <div className="text-sm text-muted-foreground mb-1">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Kategori</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight">Manajemen Kategori</h1>
            <p className="mt-2 text-sm text-slate-500">Kelola kategori produk Anda — tambahkan, edit, atau hapus kategori dengan mudah.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-50 rounded-md px-3 py-2">
              <Input placeholder="Cari kategori..." className="w-72 bg-transparent border-0" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Button onClick={onCreate} className="bg-slate-900 text-white hover:bg-slate-800">Buat Kategori</Button>
          </div>
        </div>
        <Separator />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="text-sm text-muted-foreground">Daftar kategori yang tersedia</div>
        </div>
            <div className="p-4 overflow-x-auto">
              {loading ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><Spinner /> Memuat kategori...</div>
                  <div className="grid grid-cols-12 gap-4 items-center py-3">
                    <Skeleton className="col-span-1 h-6" />
                    <Skeleton className="col-span-4 h-6" />
                    <Skeleton className="col-span-6 h-6" />
                    <Skeleton className="col-span-1 h-6" />
                  </div>
                  <div className="grid grid-cols-12 gap-4 items-center py-3">
                    <Skeleton className="col-span-1 h-6" />
                    <Skeleton className="col-span-4 h-6" />
                    <Skeleton className="col-span-6 h-6" />
                    <Skeleton className="col-span-1 h-6" />
                  </div>
                </div>
              ) : (
                <div className="rounded-md overflow-hidden border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.filter((c) => c.name.toLowerCase().includes(debouncedQuery.toLowerCase())).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="w-12">{c.id}</TableCell>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.description}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => onEdit(c)} className="mr-2">Edit</Button>
                            <Button variant="link" size="sm" onClick={() => openDeleteConfirm(c.id)} className="text-red-600">Hapus</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {categories.filter((c) => c.name.toLowerCase().includes(debouncedQuery.toLowerCase())).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">Tidak ada kategori</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
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