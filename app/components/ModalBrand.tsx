"use client"

import * as React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import CategorySelect from './CategorySelect'
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

  React.useEffect(() => {
    if (editing) {
      setName(editing.name || '')
      setCategoryId(editing.category?.id ?? null)
    } else {
      setName('')
      setCategoryId(null)
    }
  }, [editing])

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
            <CategorySelect value={categoryId ?? null} onChange={(v: number) => setCategoryId(v)} />
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
