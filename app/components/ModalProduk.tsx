"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import CategorySelect from "./CategorySelect"
import { toast } from "sonner"

type Props = {
  open: boolean
  onClose: () => void
  onSaved?: (data?: unknown) => void
  editing: { id: number; name: string; price: number; stock: number; cost?: number; category?: { id: number } | null } | null
}

export default function ModalProduk({ open, onClose, onSaved, editing }: Props) {
  const [name, setName] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [cost, setCost] = React.useState("")
  const [stock, setStock] = React.useState("")
  const [categoryId, setCategoryId] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const nameRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (editing) {
      setName(editing.name || "")
      setPrice(String(editing.price ?? ""))
      setCost(String(editing.cost ?? ""))
      setStock(String(editing.stock ?? ""))
      setCategoryId(editing.category?.id ?? null)
    } else {
      setName("")
      setPrice("")
      setCost("")
      setStock("")
      setCategoryId(null)
    }
  }, [editing])

  React.useEffect(() => {
    // focus name field when modal opens
    if (open) setTimeout(() => nameRef.current?.focus(), 80)
  }, [open])

  const validateField = (k: string, v: string) => {
    const errs: Record<string, string> = {}
    if (k === 'name') {
      if (!v || v.trim() === '') errs.name = 'Nama produk wajib diisi'
    }
    if (k === 'price') {
      const n = Number(v)
      if (!Number.isInteger(n) || n < 0) errs.price = 'Harga harus bilangan bulat >= 0'
    }
    if (k === 'cost') {
      const n = Number(v)
      if (!Number.isInteger(n) || n < 0) errs.cost = 'Harga modal harus bilangan bulat >= 0'
    }
    if (k === 'stock') {
      const n = Number(v)
      if (!Number.isInteger(n) || n < 0) errs.stock = 'Stok harus bilangan bulat >= 0'
    }
    setFieldErrors(prev => ({ ...prev, ...errs }))
    return Object.keys(errs).length === 0
  }

  const validateAll = () => {
    const ne = validateField('name', name)
    const pe = validateField('price', price)
    const ce = validateField('cost', cost)
    const se = validateField('stock', stock)
    return ne && pe && ce && se
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // inline validation
    setFieldErrors({})
    if (!validateAll()) {
      setError('Periksa kembali isian yang ditandai')
      return
    }
    const trimmed = name.trim()
    const p = Number(price)
    const c = Number(cost ?? 0)
    const s = Number(stock)

    setSaving(true)
    try {
  const method = editing ? 'PUT' : 'POST'
  const body: { name: string; price: number; cost?: number; stock: number; categoryId?: number; id?: number } = { name: trimmed, price: p, cost: c, stock: s }
      if (categoryId) body.categoryId = categoryId
      if (editing) body.id = editing.id

      const res = await fetch('/api/produk', { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data?.error || 'Gagal menyimpan produk'
        setError(msg)
        toast.error(msg)
        return
      }
  const data = await res.json()
  toast.success(editing ? 'Produk diperbarui' : 'Produk dibuat')
  if (onSaved) onSaved(data)
      onClose()
    } catch (err) {
      console.error(err)
      setError('Terjadi kesalahan saat menyimpan')
      toast.error('Terjadi kesalahan saat menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="text-lg">{editing ? 'Edit Produk' : 'Buat Produk'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="product-name" className="block text-sm font-medium mb-1">Nama <span className="text-destructive">*</span></label>
            <Input id="product-name" ref={nameRef} placeholder="Masukkan nama produk" value={name} onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: '' })) }} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'name-error' : undefined} />
            {fieldErrors.name ? <div id="name-error" className="text-xs text-destructive mt-1">{fieldErrors.name}</div> : null}
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3">
            <div>
              <label htmlFor="product-price" className="block text-sm font-medium mb-1">Harga Jual (IDR)</label>
              <Input
                id="product-price"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={price}
                onChange={(e) => { setPrice(e.target.value); setFieldErrors(prev => ({ ...prev, price: '' })) }}
                onBlur={() => setPrice(prev => prev === '' ? '' : String(Math.max(0, Math.floor(Number(prev) || 0))))}
                aria-invalid={!!fieldErrors.price}
                aria-describedby={fieldErrors.price ? 'price-error' : undefined}
              />
              <div className="text-xs text-muted-foreground mt-1">{price !== '' && Number.isFinite(Number(price)) ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(price)) : 'Masukkan harga jual'}</div>
              {fieldErrors.price ? <div id="price-error" role="alert" className="text-xs text-destructive mt-1">{fieldErrors.price}</div> : null}
            </div>

            <div>
              <label htmlFor="product-cost" className="block text-sm font-medium mb-1">Harga Modal (IDR)</label>
              <Input
                id="product-cost"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={cost}
                onChange={(e) => { setCost(e.target.value); setFieldErrors(prev => ({ ...prev, cost: '' })) }}
                onBlur={() => setCost(prev => prev === '' ? '' : String(Math.max(0, Math.floor(Number(prev) || 0))))}
                aria-invalid={!!fieldErrors.cost}
                aria-describedby={fieldErrors.cost ? 'cost-error' : undefined}
              />
              <div className="text-xs text-muted-foreground mt-1">{cost !== '' && Number.isFinite(Number(cost)) ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(cost)) : 'Masukkan harga modal'}</div>
              {fieldErrors.cost ? <div id="cost-error" role="alert" className="text-xs text-destructive mt-1">{fieldErrors.cost}</div> : null}
            </div>

            <div>
              <label htmlFor="product-stock" className="block text-sm font-medium mb-1">Stok</label>
              <Input
                id="product-stock"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={stock}
                onChange={(e) => { setStock(e.target.value); setFieldErrors(prev => ({ ...prev, stock: '' })) }}
                onBlur={() => setStock(prev => prev === '' ? '' : String(Math.max(0, Math.floor(Number(prev) || 0))))}
                aria-invalid={!!fieldErrors.stock}
                aria-describedby={fieldErrors.stock ? 'stock-error' : undefined}
              />
              {fieldErrors.stock ? <div id="stock-error" role="alert" className="text-xs text-destructive mt-1">{fieldErrors.stock}</div> : null}
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Kategori</label>
            <CategorySelect value={categoryId ?? undefined} onChange={(v: number) => setCategoryId(v)} />
          </div>
          {error && <div className="text-sm text-destructive mb-2">{error}</div>}
          <Separator />
          <SheetFooter className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-sm text-muted-foreground">{error ? <span className="text-destructive">{error}</span> : <span className="text-muted-foreground">Semua harga &amp; stok harus bilangan bulat &gt;= 0</span>}</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose}>Batal</Button>
              <Button type="submit" disabled={saving} className="bg-sky-600 text-white hover:bg-sky-700">{saving ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}