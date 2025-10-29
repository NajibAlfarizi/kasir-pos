"use client"

import * as React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange?: (open: boolean) => void
  onSaved?: () => void
  editing?: { id: number; name: string; category?: { id: number } | null } | null
}

export default function ModalBrand({ open, onOpenChange, onSaved, editing }: Props) {
  const [name, setName] = React.useState('')
  const [categoryId, setCategoryId] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [categories, setCategories] = React.useState<{ id: number; name: string }[]>([])
  const [catFilter, setCatFilter] = React.useState('')

  React.useEffect(() => {
    if (editing) {
      setName(editing.name || '')
      setCategoryId(editing.category?.id ?? null)
    } else {
      setName('')
      setCategoryId(null)
    }
  }, [editing])

  // load categories for dropdown
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

  const close = () => onOpenChange && onOpenChange(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name.trim()) return toast.error('Nama brand wajib diisi')
    setSaving(true)
    try {
      const body = { name: name.trim(), categoryId } as { name: string; categoryId?: number | null; id?: number }
      const method = editing ? 'PUT' : 'POST'
      if (editing) body.id = editing.id
      const res = await fetch('/api/brand', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(json?.error || 'Gagal menyimpan brand')
      toast.success(editing ? 'Brand diperbarui' : 'Brand dibuat')
      if (onSaved) onSaved()
      close()
    } catch (err) {
      console.error(err)
      toast.error('Terjadi kesalahan saat menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => onOpenChange && onOpenChange(v)}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="text-lg">{editing ? 'Edit Brand' : 'Buat Brand'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nama <span className="text-destructive">*</span></label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama brand" />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Kategori</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white shadow-sm text-sm hover:shadow-md w-44 text-left">
                  <span className="font-medium">{categoryId === null ? 'Pilih Kategori' : (categories.find(c => c.id === categoryId)?.name ?? 'Kategori')}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-44">
                <div className="px-2 py-1">
                  <input value={catFilter} onChange={(e) => setCatFilter(e.target.value)} placeholder="Cari kategori..." className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div className="max-h-56 overflow-auto">
                  {categories.filter(c => c.name.toLowerCase().includes(catFilter.toLowerCase())).map(cat => (
                    <DropdownMenuItem key={cat.id} onSelect={() => { setCategoryId(cat.id); setCatFilter('') }}>
                      <div className="flex items-center justify-between w-full">
                        <span>{cat.name}</span>
                        {categoryId === cat.id ? <span className="text-sky-600">✓</span> : null}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuItem onSelect={() => { setCategoryId(null); setCatFilter('') }}>
                  Tidak ada Kategori
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator />
          <SheetFooter className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={close}>Batal</Button>
            <Button type="submit" className="bg-sky-600 text-white" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
