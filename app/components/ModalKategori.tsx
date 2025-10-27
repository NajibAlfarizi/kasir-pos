"use client"

import * as React from "react"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: { id: number; name: string; description?: string | null } | null
}

export default function ModalKategori({ open, onClose, onSaved, editing }: Props) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (editing) {
      setName(editing.name || "")
      setDescription(editing.description || "")
    } else {
      setName("")
      setDescription("")
    }
  }, [editing])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // client-side validation
    if (!name.trim()) {
      setError('Nama kategori wajib diisi')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/kategori', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(editing ? { id: editing.id, name, description } : { name, description }), headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data?.error || 'Gagal menyimpan kategori'
        setError(msg)
        toast.error(msg)
        return
      }
      onSaved()
      toast.success(editing ? 'Kategori diperbarui' : 'Kategori dibuat')
    } catch (err) {
      const e = err as Error
      setError(e.message)
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit Kategori' : 'Buat Kategori'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="p-4">
          <div className="mb-3">
            <label className="block text-sm mb-1">Nama</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Deskripsi</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && <div className="text-sm text-destructive mb-2">{error}</div>}
          <Separator />
          <SheetFooter className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}