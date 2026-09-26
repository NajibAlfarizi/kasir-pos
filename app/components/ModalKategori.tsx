"use client"

import * as React from "react"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { FolderTree } from "lucide-react"

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
      <SheetContent side="right" className="sm:max-w-md flex flex-col justify-between">
        <div>
          <SheetHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <FolderTree className="w-5 h-5" />
              </div>
              <SheetTitle className="text-base font-bold text-slate-900">
                {editing ? 'Edit Kategori' : 'Buat Kategori Baru'}
              </SheetTitle>
            </div>
          </SheetHeader>
          <form id="kategori-form" onSubmit={onSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Kategori <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Contoh: Minuman, Makanan Ringan..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deskripsi (Opsional)</label>
              <Input
                placeholder="Deskripsi singkat kategori..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-indigo-500"
              />
            </div>
            {error && <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{error}</div>}
          </form>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <SheetFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg h-9">
              Batal
            </Button>
            <Button
              type="submit"
              form="kategori-form"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 text-xs font-medium shadow-xs"
            >
              {saving ? <><Spinner className="mr-1.5" /> Menyimpan...</> : 'Simpan Kategori'}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}