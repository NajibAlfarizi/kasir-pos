"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

type Brand = { id: number; name: string }

export default function BrandPage() {
  const [brands, setBrands] = React.useState<Brand[]>([])
  // loading state removed because it's not used in the UI; kept hooks small
  const [name, setName] = React.useState('')
  const [editing, setEditing] = React.useState<Brand | null>(null)

  const fetchBrands = React.useCallback(async () => {
    try {
      const res = await fetch('/api/brand')
      const json = await res.json()
      setBrands(json || [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat brand')
    }
  }, [])

  React.useEffect(() => { fetchBrands() }, [fetchBrands])

  const handleCreate = async () => {
    if (!name.trim()) return toast.error('Nama brand wajib diisi')
    try {
      const res = await fetch('/api/brand', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) })
      const json = await res.json()
      if (!res.ok) return toast.error(json?.error || 'Gagal membuat brand')
      toast.success('Brand dibuat')
      setName('')
      fetchBrands()
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat brand')
    }
  }

  const startEdit = (b: Brand) => { setEditing(b); setName(b.name) }
  const cancelEdit = () => { setEditing(null); setName('') }

  const handleSave = async () => {
    if (!editing) return
    if (!name.trim()) return toast.error('Nama brand wajib diisi')
    try {
      const res = await fetch('/api/brand', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, name: name.trim() }) })
      const json = await res.json()
      if (!res.ok) return toast.error(json?.error || 'Gagal memperbarui brand')
      toast.success('Brand diperbarui')
      setEditing(null)
      setName('')
      fetchBrands()
    } catch (err) {
      console.error(err)
      toast.error('Gagal memperbarui brand')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus brand ini?')) return
    try {
      const res = await fetch(`/api/brand?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        return toast.error(json?.error || 'Gagal menghapus')
      }
      toast.success('Brand dihapus')
      fetchBrands()
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghapus brand')
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
        <div className="flex gap-2">
          <Input placeholder="Nama brand" value={name} onChange={(e) => setName(e.target.value)} />
          {editing ? (
            <>
              <Button onClick={handleSave} className="bg-emerald-600 text-white">Simpan</Button>
              <Button variant="ghost" onClick={cancelEdit}>Batal</Button>
            </>
          ) : (
            <Button onClick={handleCreate} className="bg-sky-600 text-white">Buat</Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="w-28 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="px-2 py-2">{b.id}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(b)}>Edit</Button>
                      <Button variant="link" size="sm" onClick={() => handleDelete(b.id)} className="text-red-600">Hapus</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {brands.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">Belum ada brand</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
