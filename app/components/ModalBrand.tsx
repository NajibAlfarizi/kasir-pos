"use client"

import * as React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Tag, ChevronDown, Check } from 'lucide-react'
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
      <SheetContent side="right" className="sm:max-w-md flex flex-col justify-between">
        <div>
          <SheetHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Tag className="w-5 h-5" />
              </div>
              <SheetTitle className="text-base font-bold text-slate-900">
                {editing ? 'Edit Brand' : 'Buat Brand Baru'}
              </SheetTitle>
            </div>
          </SheetHeader>

          <form id="brand-form" onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Brand <span className="text-rose-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Aqua, Indomie, Unilever..."
                className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kategori Terkait</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center justify-between w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors h-9">
                    <span>{categoryId === null ? 'Pilih Kategori (Opsional)' : (categories.find(c => c.id === categoryId)?.name ?? 'Kategori')}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-72 p-1 rounded-xl shadow-lg border-slate-200">
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
                      onSelect={() => { setCategoryId(null); setCatFilter('') }}
                      className="text-xs rounded-lg cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>Tanpa Kategori</span>
                        {categoryId === null ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : null}
                      </div>
                    </DropdownMenuItem>
                    {categories.filter(c => c.name.toLowerCase().includes(catFilter.toLowerCase())).map(cat => (
                      <DropdownMenuItem
                        key={cat.id}
                        onSelect={() => { setCategoryId(cat.id); setCatFilter('') }}
                        className="text-xs rounded-lg cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{cat.name}</span>
                          {categoryId === cat.id ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : null}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <SheetFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={close} className="rounded-lg h-9">
              Batal
            </Button>
            <Button
              type="submit"
              form="brand-form"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 text-xs font-medium shadow-xs"
            >
              {saving ? <><Spinner className="mr-1.5" /> Menyimpan...</> : 'Simpan Brand'}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
