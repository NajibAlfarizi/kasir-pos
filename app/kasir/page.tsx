"use client"

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
// icons
import { toast } from 'sonner'
// Separator and Table components removed from this redesigned page
// icons

type Product = { id: number; name: string; price: number; stock: number }
type Category = { id: number; name: string }
type CartLine = { id: string; product?: Product; productId?: number; name?: string; qty: number; price: number }
type ReceiptItem = { id: number; product?: Product | null; quantity: number; subtotal: number }
type Receipt = { id: number; total: number; paid: number; change: number; createdAt: string; items: ReceiptItem[] }

export default function KasirPage() {
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [products, setProducts] = React.useState<Product[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [brands, setBrands] = React.useState<{ id: number; name: string }[]>([])
  const [catFilter, setCatFilter] = React.useState('')
  const [brandFilter, setBrandFilter] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<number | ''>('')
  const [selectedBrand, setSelectedBrand] = React.useState<number | ''>('')
  const [highlightedIds, setHighlightedIds] = React.useState<number[]>([])
  const [cart, setCart] = React.useState<CartLine[]>([])
  const [manualName, setManualName] = React.useState('')
  const [manualPrice, setManualPrice] = React.useState<string>('')
  const [paidAmount, setPaidAmount] = React.useState<number | ''>('')
  const [receipt, setReceipt] = React.useState<Receipt | null>(null)

  const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const fetchProducts = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedQuery) params.set('q', debouncedQuery)
      // show all products (no per-page limit)
      if (selectedCategory !== '') params.set('categoryId', String(selectedCategory))
      if (selectedBrand !== '') params.set('brandId', String(selectedBrand))
      const res = await fetch(`/api/produk?${params.toString()}`)
      const json = await res.json()
      setProducts(json.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat produk')
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, selectedCategory, selectedBrand])

  React.useEffect(() => { fetchProducts() }, [fetchProducts])

  // load categories for filter + quick chips
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/kategori')
        if (!res.ok) return
  const json = await res.json()
  if (!mounted) return
  // API may return either an array or an object like { data: [] }
  const data = Array.isArray(json) ? json : (json?.data ?? [])
  setCategories(data)
      } catch (err) {
        console.error('load categories', err)
      }
    })()
    return () => { mounted = false }
  }, [])

  // load brands for filter
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

  const addToCart = (p: Product) => {
    setCart((c) => {
      const idx = c.findIndex(x => x.productId === p.id)
      if (idx !== -1) {
        // increment qty but don't exceed stock
        const cloned = [...c]
        const next = Math.min(cloned[idx].qty + 1, p.stock)
        cloned[idx] = { ...cloned[idx], qty: next }
        return cloned
      }
      return [...c, { id: `p-${p.id}`, product: p, productId: p.id, qty: 1, price: p.price }]
    })
  }

  const updateQty = (lineId: string, qty: number) => {
    setCart(c => c.map(l => {
      if (l.id !== lineId) return l
      let next = Math.max(1, qty)
      if (l.product) next = Math.min(next, l.product.stock)
      return { ...l, qty: next }
    }))
  }

  const removeLine = (lineId: string) => setCart(c => c.filter(l => l.id !== lineId))

  const addManualToCart = () => {
    const name = manualName.trim()
    const price = Number(manualPrice)
    if (!name) return toast.error('Nama manual wajib diisi')
    if (!Number.isInteger(price) || price < 0) return toast.error('Harga harus bilangan bulat >= 0')
    const line: CartLine = { id: `m-${Date.now()}`, name, qty: 1, price }
    setCart(c => [...c, line])
    setManualName('')
    setManualPrice('')
  }

  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('Cart kosong')
    // submitting inline handled by submitPayment
    await submitPayment()
  }

  const submitPayment = async () => {
    if (paidAmount === '' || typeof paidAmount !== 'number') return toast.error('Masukkan jumlah tunai')
    const payload = {
      items: cart.map(l => l.productId ? ({ productId: l.productId, quantity: l.qty, price: l.price }) : ({ name: l.name, quantity: l.qty, price: l.price })),
      paid: paidAmount,
    }
    try {
      // Optimistic UI: decrement stock locally for product-based items immediately
      type ItemPayload = { productId?: number; quantity: number; price?: number }
      const items: ItemPayload[] = payload.items as ItemPayload[]
      const affectedIds: number[] = items.filter(i => i.productId).map(i => i.productId!)
      setProducts(prev => prev.map(p => {
        if (!affectedIds.includes(p.id)) return p
        const qty = items.find(it => it.productId === p.id)?.quantity || 0
        return { ...p, stock: Math.max(0, p.stock - qty) }
      }))
      setHighlightedIds(affectedIds)

      const res = await fetch('/api/transaksi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error || 'Gagal melakukan transaksi')
        // rollback optimistic changes by re-fetching
        await fetchProducts()
        setHighlightedIds([])
        return
      }

      toast.success('Transaksi berhasil')
      // reset cart and show receipt
      setCart([])
      setPaidAmount('')
      setReceipt(json)

      // keep highlight briefly then refresh real data
      setTimeout(() => setHighlightedIds([]), 1200)
      try { await fetchProducts() } catch { /* ignore */ }
    } catch (err) {
      console.error(err)
      toast.error('Gagal melakukan transaksi')
      try { await fetchProducts() } catch { /* ignore */ }
      setHighlightedIds([])
    }
  }

  return (
    <div className="space-y-4">
      <header className="sticky top-4 z-40 bg-white/80 backdrop-blur-sm rounded-md px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">KasirQu</h1>
          <p className="text-sm text-slate-500">Cepat. Bersih. Aman. Tambahkan produk lalu lakukan pembayaran.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white shadow-sm rounded-lg px-3 py-2">
            <Input placeholder="Cari produk..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-56 md:w-80 bg-transparent" />
            {loading && <Spinner />}
          </div>
          <Button onClick={() => { setCart([]); toast('Keranjang dikosongkan') }} className="bg-red-50 text-red-700 hover:bg-red-100">Kosongkan</Button>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-6">
  {/* Products column */}
  <section className="col-span-12 lg:col-span-7">
          <div className="bg-gradient-to-b from-white to-slate-50 rounded-lg p-4 shadow">
            {/* Filters: category select + quick chips */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-white shadow-sm text-sm hover:shadow-md">
                      <span className="font-medium">{selectedCategory === '' ? 'Semua Kategori' : (categories.find(c => c.id === selectedCategory)?.name ?? 'Kategori')}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="max-w-xs">
                    <div className="px-2 py-1">
                      <input
                        value={catFilter}
                        onChange={(e) => setCatFilter(e.target.value)}
                        placeholder="Cari kategori..."
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="max-h-56 overflow-auto">
                      {categories.filter(c => c.name.toLowerCase().includes(catFilter.toLowerCase())).map(cat => (
                        <DropdownMenuItem key={cat.id} onSelect={() => { setSelectedCategory(cat.id); setCatFilter('') }}>
                          <div className="flex items-center justify-between w-full">
                            <span>{cat.name}</span>
                            {selectedCategory === cat.id ? <span className="text-sky-600">✓</span> : null}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                    <DropdownMenuItem onSelect={() => { setSelectedCategory(''); setCatFilter('') }}>
                      Semua Kategori
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                  <div className="ml-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-white shadow-sm text-sm hover:shadow-md">
                          <span className="font-medium">{selectedBrand === '' ? 'Semua Brand' : (brands.find(b => b.id === selectedBrand)?.name ?? 'Brand')}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="max-w-xs">
                        <div className="px-2 py-1">
                          <input value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} placeholder="Cari brand..." className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                        <div className="max-h-56 overflow-auto">
                          {brands.filter(b => b.name.toLowerCase().includes(brandFilter.toLowerCase())).map(b => (
                            <DropdownMenuItem key={b.id} onSelect={() => { setSelectedBrand(b.id); setBrandFilter('') }}>
                              <div className="flex items-center justify-between w-full">
                                <span>{b.name}</span>
                                {selectedBrand === b.id ? <span className="text-sky-600">✓</span> : null}
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </div>
                        <DropdownMenuItem onSelect={() => { setSelectedBrand(''); setBrandFilter('') }}>
                          Semua Brand
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
              </div>
            </div>

            {/* Products grid - show all products (no fixed max height) */}
            <div className="pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                {products.map(p => (
                  <article
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => p.stock > 0 && addToCart(p)}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && p.stock > 0) { e.preventDefault(); addToCart(p) } }}
                    aria-disabled={p.stock <= 0}
                    className={`relative rounded-lg border overflow-hidden h-full min-h-[72px] p-2 ${highlightedIds.includes(p.id) ? 'ring-2 ring-amber-300 bg-amber-50' : 'bg-white'} transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-200 ${p.stock > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
                  >
                    <div className="flex flex-col h-full justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 leading-tight mb-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                        {p.stock <= 0 ? (
                          <div className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 mb-2">Stok Habis</div>
                        ) : (
                          <div className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 mb-2">Stok: {p.stock}</div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-emerald-600">{fmt.format(p.price)}</div>
                        {p.stock <= 0 ? <div className="text-xs text-slate-400">Tidak tersedia</div> : null}
                      </div>
                    </div>
                  </article>
                ))}

                {products.length === 0 && !loading && (
                  <div className="col-span-full text-center text-sm text-slate-500">
                    {selectedCategory === '' ? 'Tidak ada produk' : 'Tidak ada produk dengan kategori ini'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Checkout / Cart column */}
  <aside className="col-span-12 lg:col-span-5">
          <div className="sticky top-6 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold text-slate-800">Keranjang</div>
              <div className="text-sm text-slate-500">{cart.length} item</div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-auto pr-2">
              {cart.length === 0 && <div className="text-sm text-slate-500">Keranjang kosong — tambahkan produk.</div>}
              {cart.map(line => (
                <div key={line.id} className="flex items-center justify-between p-3 rounded-md border bg-white gap-3">
                  <div className="min-w-0 pr-2 flex-1">
                    <div className="text-sm font-medium text-slate-800">{line.product?.name ?? line.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{fmt.format(line.price)}</div>
                  </div>

                  <div className="flex items-center gap-3 flex-none">
                    <div className="inline-flex items-center gap-2 bg-white border rounded-md px-2 py-1 shadow-sm">
                      <Button size="sm" variant="outline" onClick={() => updateQty(line.id, line.qty - 1)}>-</Button>
                      <input aria-label={`Qty ${line.product?.name ?? line.name}`} value={String(line.qty)} onChange={(e) => updateQty(line.id, Number(e.target.value || 1))} className="w-14 min-w-[48px] border text-center rounded px-1 py-0.5 text-sm" />
                      <Button size="sm" variant="outline" onClick={() => updateQty(line.id, line.qty + 1)}>+</Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeLine(line.id)} className="text-red-600">Hapus</Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Manual add block */}
            <div className="mt-3 border-t pt-3">
              <div className="text-sm font-medium mb-2">Produk Manual</div>
              <input placeholder="Nama produk" value={manualName} onChange={(e) => setManualName(e.target.value)} className="w-full border px-2 py-1 rounded mb-2" />
              <input placeholder="Harga (IDR)" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} type="number" className="w-full border px-2 py-1 rounded mb-2" />
              <div className="flex gap-2">
                <Button onClick={addManualToCart} className="flex-1">Tambah</Button>
                <Button variant="ghost" onClick={() => { setManualName(''); setManualPrice('') }} className="flex-1">Batal</Button>
              </div>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between text-sm text-slate-600"><div>Subtotal</div><div>{fmt.format(subtotal)}</div></div>
              <div className="flex justify-between mt-1 font-extrabold text-2xl text-slate-900"><div>Total</div><div>{fmt.format(subtotal)}</div></div>

              <div className="mt-4">
                <label className="block text-sm mb-2">Tunai</label>
                <input type="number" aria-label="Tunai" value={paidAmount === '' ? '' : paidAmount} onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border px-3 py-2 rounded text-lg" />
                <div className="mt-2 text-sm">
                  {paidAmount === '' ? null : (
                    paidAmount >= subtotal ? (
                      <div className="text-green-600">Kembalian: {fmt.format(paidAmount - subtotal)}</div>
                    ) : (
                      <div className="text-red-600">Kurang: {fmt.format(subtotal - paidAmount)}</div>
                    )
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button onClick={() => { setCart([]); toast('Keranjang dikosongkan') }} className="w-full bg-red-50 text-red-700 hover:bg-red-100">Bersihkan</Button>
                  <Button onClick={handleCheckout} disabled={cart.length === 0 || paidAmount === '' || Number(paidAmount) < subtotal} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">Selesaikan</Button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Receipt modal (keeps functionality) */}
      {receipt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Struk Transaksi</h3>
                <div className="text-sm text-slate-500">ID: {receipt.id} • {new Date(receipt.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setReceipt(null) }}>Tutup</Button>
                <Button onClick={async () => {
                  if (!receipt?.id) return toast.error('Receipt ID tidak tersedia')
                  try {
                    const res = await fetch(`/api/print/transaction/${receipt.id}`, { method: 'POST' })
                    const json = await res.json()
                    if (!res.ok) return toast.error(json?.error || 'Gagal mencetak struk')
                    toast.success('Perintah cetak dikirim ke printer')
                  } catch (err) {
                    console.error(err)
                    toast.error('Gagal menghubungi server cetak')
                  }
                }}>Kirim ke Printer</Button>
              </div>
            </div>

            <div className="mt-4">
              <div className="space-y-2">
                {receipt.items.map((it: ReceiptItem) => (
                  <div key={it.id} className="flex justify-between">
                    <div>{it.product?.name || 'Produk'} x{it.quantity}</div>
                    <div>{fmt.format(it.subtotal)}</div>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between"><div>Total</div><div>{fmt.format(receipt.total)}</div></div>
                  <div className="flex justify-between"><div>Bayar</div><div>{fmt.format(receipt.paid)}</div></div>
                  <div className="flex justify-between"><div>Kembali</div><div>{fmt.format(receipt.change)}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
