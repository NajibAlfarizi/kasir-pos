"use client"

import * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import BarcodeCameraScanner from './BarcodeCameraScanner'
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Package, Camera, ChevronDown, Check } from "lucide-react"

type Props = {
  open: boolean
  onClose: () => void
  onSaved?: (data?: unknown) => void
  editing: { id: number; name: string; price: number; stock: number; cost?: number; category?: { id: number } | null; brand?: { id: number } | null; barcode?: string } | null
}

export default function ModalProduk({ open, onClose, onSaved, editing }: Props) {
  const [name, setName] = React.useState("")
  const [barcode, setBarcode] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [cost, setCost] = React.useState("")
  const [stock, setStock] = React.useState("")
  const [categoryId, setCategoryId] = React.useState<number | null>(null)
  const [brandId, setBrandId] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [categories, setCategories] = React.useState<{ id: number; name: string }[]>([])
  const [brands, setBrands] = React.useState<{ id: number; name: string; category?: { id: number; name: string } | null }[]>([])
  const [catFilter, setCatFilter] = React.useState('')
  const [brandFilter, setBrandFilter] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const [showCameraScanner, setShowCameraScanner] = React.useState(false)
  const nameRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (editing) {
      setName(editing.name || "")
      setBarcode(editing.barcode || "")
      setPrice(String(editing.price ?? ""))
      setCost(String(editing.cost !== undefined && editing.cost !== null ? editing.cost : ""))
      setStock(String(editing.stock ?? ""))
      setCategoryId(editing.category?.id ?? null)
      setBrandId(editing.brand?.id ?? null)
    } else {
      setName("")
      setBarcode("")
      setPrice("")
      setCost("")
      setStock("")
      setCategoryId(null)
      setBrandId(null)
    }
    setError(null)
    setFieldErrors({})
  }, [editing])

  React.useEffect(() => {
    // focus name field when modal opens and clear errors
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 80)
    } else {
      // Clear errors when modal closes
      setError(null)
      setFieldErrors({})
    }
  }, [open])

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

  // load brands for dropdown
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/brand')
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        const data = Array.isArray(json) ? json : (json?.data ?? [])
        setBrands(data)
      } catch (err) {
        console.error('load brands', err)
      }
    })()
    return () => { mounted = false }
  }, [])

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
    if (k === 'category') {
      if (!v || v === '') errs.category = 'Kategori wajib dipilih'
    }
    if (k === 'brand') {
      if (!v || v === '') errs.brand = 'Brand wajib dipilih'
    }
    setFieldErrors(prev => ({ ...prev, ...errs }))
    return Object.keys(errs).length === 0
  }

  const validateAll = () => {
    const ne = validateField('name', name)
    const pe = validateField('price', price)
    const ce = validateField('cost', cost)
    const se = validateField('stock', stock)
    const cate = validateField('category', categoryId ? String(categoryId) : '')
    const brande = validateField('brand', brandId ? String(brandId) : '')
    return ne && pe && ce && se && cate && brande
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
    const body: { name: string; barcode?: string; price: number; cost?: number; stock: number; categoryId?: number; brandId?: number; id?: number } = { name: trimmed, price: p, cost: c, stock: s }
      if (barcode.trim()) body.barcode = barcode.trim()
      if (categoryId) body.categoryId = categoryId
      if (brandId) body.brandId = brandId
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
  if (onSaved) {
    onSaved(data)
  } else {
    onClose()
  }
    } catch (err) {
      console.error(err)
      setError('Terjadi kesalahan saat menyimpan')
      toast.error('Terjadi kesalahan saat menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <SheetContent side="right" className="flex flex-col h-full p-0">
        <SheetHeader className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Package className="w-5 h-5" />
            </div>
            <SheetTitle className="text-base font-bold text-slate-900">{editing ? 'Edit Produk' : 'Buat Produk Baru'}</SheetTitle>
          </div>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4">
            <label htmlFor="product-name" className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Produk <span className="text-rose-500">*</span></label>
            <Input id="product-name" ref={nameRef} placeholder="Masukkan nama produk" value={name} onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: '' })) }} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'name-error' : undefined} className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-indigo-500" />
            {fieldErrors.name ? <div id="name-error" className="text-xs text-destructive mt-1">{fieldErrors.name}</div> : null}
          </div>

          <div className="mb-4">
            <label htmlFor="product-barcode" className="block text-xs font-semibold text-slate-700 mb-1.5">Barcode <span className="text-xs text-muted-foreground font-normal">(opsional)</span></label>
            <div className="flex items-center gap-2">
              <Input 
                id="product-barcode" 
                placeholder="Scan atau ketik barcode" 
                value={barcode} 
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                  }
                }}
                className="flex-1 h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-indigo-500" 
              />
              <Button 
                type="button"
                onClick={() => setShowCameraScanner(true)} 
                variant="outline"
                className="flex items-center gap-1.5 h-9 rounded-lg border-slate-200 text-xs font-medium"
              >
                <Camera className="w-4 h-4 text-indigo-600" />
                Scan
              </Button>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Scan barcode fisik dengan scanner, kamera, atau ketik manual</div>
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
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div>
                <div className="text-sm mb-1">Kategori <span className="text-destructive">*</span></div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors w-44 text-left h-9 ${fieldErrors.category ? 'border-destructive' : ''}`}>
                      <span className="truncate">{categoryId === null ? 'Pilih Kategori' : (categories.find(c => c.id === categoryId)?.name ?? 'Kategori')}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-56 p-1 rounded-xl shadow-lg border-slate-200">
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
                        onSelect={() => { setCategoryId(null); setCatFilter(''); setFieldErrors(prev => ({ ...prev, category: '' })) }}
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
                          onSelect={() => { setCategoryId(cat.id); setCatFilter(''); setFieldErrors(prev => ({ ...prev, category: '' })) }}
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
                {fieldErrors.category ? <div className="text-xs text-destructive mt-1">{fieldErrors.category}</div> : null}
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1.5">Brand <span className="text-rose-500">*</span></div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors w-44 text-left h-9 ${fieldErrors.brand ? 'border-destructive' : ''}`}>
                      <span className="truncate">{brandId === null ? 'Pilih Brand' : (brands.find(b => b.id === brandId)?.name ?? 'Brand')}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-56 p-1 rounded-xl shadow-lg border-slate-200">
                    <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                      <input
                        value={brandFilter}
                        onChange={(e) => setBrandFilter(e.target.value)}
                        placeholder="Cari brand..."
                        className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div className="max-h-56 overflow-auto">
                      <DropdownMenuItem
                        onSelect={() => { setBrandId(null); setBrandFilter('') }}
                        className="text-xs rounded-lg cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>Tanpa Brand</span>
                          {brandId === null ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : null}
                        </div>
                      </DropdownMenuItem>
                      {brands.filter(b => (!categoryId || b.category?.id === categoryId) && b.name.toLowerCase().includes(brandFilter.toLowerCase())).map(b => (
                        <DropdownMenuItem
                          key={b.id}
                          onSelect={() => { setBrandId(b.id); setBrandFilter(''); setFieldErrors(prev => ({ ...prev, brand: '' })) }}
                          className="text-xs rounded-lg cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{b.name}</span>
                            {brandId === b.id ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : null}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                {fieldErrors.brand ? <div className="text-xs text-destructive mt-1">{fieldErrors.brand}</div> : null}
              </div>
            </div>
          </div>
          </div>
          
          <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
            {error && <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 mb-3">{error}</div>}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-lg h-9 w-full sm:w-auto">Batal</Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg h-9 text-xs font-medium shadow-xs w-full sm:w-auto"
              >
                {saving ? <><Spinner className="mr-1.5" /> Menyimpan...</> : 'Simpan Produk'}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
    
    {/* Camera Scanner Modal - Outside Sheet to prevent auto-close */}
    {showCameraScanner && (
      <BarcodeCameraScanner
        open={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanned={(detectedBarcode) => {
          setBarcode(detectedBarcode)
          setShowCameraScanner(false)
          toast.success('Barcode berhasil discan')
        }}
      />
    )}
  </>
  )
}