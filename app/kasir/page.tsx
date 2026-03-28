"use client"

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import BarcodeCameraScanner from '../components/BarcodeCameraScanner'
import { toast } from 'sonner'
// Separator and Table components removed from this redesigned page
// icons

type Product = { id: number; name: string; price: number; stock: number; barcode?: string }
type CartLine = { id: string; product?: Product; productId?: number; name?: string; qty: number; price: number }
type ReceiptItem = { id: number; product?: Product | null; name?: string | null; quantity: number; subtotal: number }
type Receipt = { id: number; total: number; paid: number; change: number; createdAt: string; items: ReceiptItem[] }

export default function KasirPage() {
  const [barcode, setBarcode] = React.useState('')
  const [cart, setCart] = React.useState<CartLine[]>([])
  const [paidAmount, setPaidAmount] = React.useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [receipt, setReceipt] = React.useState<Receipt | null>(null)
  const [autoPrintEnabled, setAutoPrintEnabled] = React.useState(false)
  const [printCopies, setPrintCopies] = React.useState(1)
  const [showCameraScanner, setShowCameraScanner] = React.useState(false)
  const [manualName, setManualName] = React.useState('')
  const [manualPrice, setManualPrice] = React.useState<string>('')
  const barcodeInputRef = React.useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<Product[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchCache, setSearchCache] = React.useState<Record<string, { results: Product[]; timestamp: number }>>({})
  const paymentInputRef = React.useRef<HTMLInputElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

  // load settings to determine if client-side auto-print should be triggered
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) return
        const json = await res.json()
        if (!mounted) return
        const v = (json['print.auto'] ?? json['autoPrint'] ?? '').toString().toLowerCase()
        setAutoPrintEnabled(v === '1' || v === 'true' || v === 'yes')
        const copies = parseInt(json['printCopies'] ?? json['print.copies'] ?? '1') || 1
        setPrintCopies(copies)
      } catch (e) {
        console.warn('Failed to load settings for auto-print', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  const addToCart = React.useCallback((p: Product) => {
    setCart((prevCart) => {
      const idx = prevCart.findIndex(x => x.productId === p.id)

      if (idx !== -1) {
        // Increment qty and move updated item to the top for latest-scan-first ordering.
        const cloned = [...prevCart]
        const currentQty = cloned[idx].qty
        const next = Math.min(currentQty + 1, p.stock)
        const updated = { ...cloned[idx], qty: next }
        cloned.splice(idx, 1)
        cloned.unshift(updated)
        return cloned
      }

      const newItem = { id: `p-${p.id}`, product: p, productId: p.id, qty: 1, price: p.price }
      return [newItem, ...prevCart]
    })
  }, [])

  // Barcode scanner: when user enters barcode and presses Enter, search for product and add to cart
  const handleBarcodeSubmit = React.useCallback(async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return

    try {
      const url = `/api/produk?q=${encodeURIComponent(trimmed)}`
      const res = await fetch(url)

      if (!res.ok) {
        toast.error('Gagal mencari produk')
        return
      }

      const json = await res.json()
      const data = Array.isArray(json) ? json : (json?.data ?? [])

      // Find exact barcode match
      const match = data.find((p: Product) => p.barcode === trimmed)

      if (match) {
        if (match.stock > 0) {
          addToCart(match)
          toast.success(`${match.name} ditambahkan ke keranjang`)
          setBarcode('') // clear after adding
        } else {
          toast.error(`${match.name} stok habis`)
        }
      } else {
        toast.error(`Produk dengan barcode "${trimmed}" tidak ditemukan`)
      }
    } catch {
      toast.error('Gagal mencari produk')
    }
  }, [addToCart])

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBarcodeSubmit(barcode)
    }
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
    if (!name) return toast.error('Nama produk wajib diisi')
    if (!Number.isInteger(price) || price < 0) return toast.error('Harga harus bilangan bulat >= 0')
    const line: CartLine = { id: `m-${Date.now()}`, name, qty: 1, price }
    setCart(c => [...c, line])
    setManualName('')
    setManualPrice('')
    toast.success('Produk manual ditambahkan')
  }

  // Search products by name or barcode with client-side cache
  const searchProducts = React.useCallback(async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchResults([])
      return
    }
    
    // Check cache: use cached results if available and less than 5 minutes old
    const cached = searchCache[trimmed]
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      setSearchResults(cached.results)
      return
    }
    
    setIsSearching(true)
    try {
      const res = await fetch(`/api/produk?q=${encodeURIComponent(trimmed)}`)
      if (!res.ok) {
        toast.error('Gagal mencari produk')
        setSearchResults([])
        return
      }
      
      const json = await res.json()
      const data = Array.isArray(json) ? json : (json?.data ?? [])
      setSearchResults(data)
      
      // Update cache
      setSearchCache(prev => ({
        ...prev,
        [trimmed]: { results: data, timestamp: Date.now() }
      }))
    } catch (err) {
      console.error('Search error:', err)
      toast.error('Gagal mencari produk')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchCache])

  // Debounced search effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery, searchProducts])

  // Auto-focus to barcode input on mount
  React.useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }
  }, [])

  // Global keyboard listener for barcode scanner (physical scanner)
  React.useEffect(() => {
    let buffer = ''
    let timeout: NodeJS.Timeout | null = null

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in payment input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' && target !== barcodeInputRef.current) {
        return
      }

      // Barcode scanner sends characters quickly followed by Enter
      if (e.key === 'Enter') {
        if (buffer.length > 0) {
          handleBarcodeSubmit(buffer)
          buffer = ''
        }
      } else if (e.key.length === 1) {
        // Regular character
        buffer += e.key
        
        // Clear buffer after 100ms of no input (scanner types very fast)
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          buffer = ''
        }, 100)
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => {
      window.removeEventListener('keypress', handleKeyPress)
      if (timeout) clearTimeout(timeout)
    }
  }, [handleBarcodeSubmit])

  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0)

  const submitPayment = React.useCallback(async () => {
    if (isSubmitting) return
    if (paidAmount === '' || typeof paidAmount !== 'number') return toast.error('Masukkan jumlah tunai')
    if (cart.length === 0) return toast.error('Cart kosong')
    if (Number(paidAmount) < subtotal) return toast.error('Jumlah tunai kurang')

    const payload = {
      items: cart.map(l => l.productId ? ({ productId: l.productId, quantity: l.qty, price: l.price }) : ({ name: l.name, quantity: l.qty, price: l.price })),
      paid: paidAmount,
    }
    try {
      setIsSubmitting(true)
      const res = await fetch('/api/transaksi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error || 'Gagal melakukan transaksi')
        return
      }

      toast.success('Transaksi berhasil')
      // reset cart and show receipt
      setCart([])
      setPaidAmount('')
      setReceipt(json)

      // Print immediately if client-side auto-print is enabled.
      if (autoPrintEnabled && json?.id) {
        ;(async () => {
          try {
            const copiesToPrint = printCopies || 1

            const printUrl = `/api/print/transaction/${json.id}?copies=${copiesToPrint}`
            const pres = await fetch(printUrl, { method: 'POST' })
            const pj = await pres.json().catch(() => ({}))

            if (!pres.ok) {
              console.warn('Auto-print (client) failed', pj)
              toast.error('Gagal mengirim perintah cetak otomatis')
            } else {
              toast.success(`${copiesToPrint} struk sedang dicetak...`)
            }
          } catch (err) {
            console.error('Auto-print (client) error', err)
            toast.error('Gagal menghubungi server cetak otomatis')
          }
        })()
      }

    } catch (err) {
      console.error(err)
      toast.error('Gagal melakukan transaksi')
    } finally {
      setIsSubmitting(false)
    }
  }, [autoPrintEnabled, cart, isSubmitting, paidAmount, printCopies, subtotal])

  const handleCheckout = React.useCallback(async () => {
    if (cart.length === 0) return toast.error('Cart kosong')
    // submitting inline handled by submitPayment
    await submitPayment()
  }, [cart.length, submitPayment])

  const fillExactCash = React.useCallback(() => {
    if (cart.length === 0) return
    setPaidAmount(subtotal)
    paymentInputRef.current?.focus()
    toast.success('Tunai diisi pas sesuai total')
  }, [cart.length, subtotal])

  const fillRoundedCash = React.useCallback(() => {
    if (cart.length === 0) return
    const rounded = Math.ceil(subtotal / 1000) * 1000
    setPaidAmount(rounded)
    paymentInputRef.current?.focus()
    toast.success('Tunai dibulatkan ke atas (ribuan terdekat)')
  }, [cart.length, subtotal])

  React.useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // Esc: close receipt modal quickly
      if (key === 'escape' && receipt) {
        e.preventDefault()
        setReceipt(null)
        return
      }

      // F2: focus barcode input
      if (e.key === 'F2') {
        e.preventDefault()
        barcodeInputRef.current?.focus()
        return
      }

      // F4: focus payment input
      if (e.key === 'F4') {
        e.preventDefault()
        paymentInputRef.current?.focus()
        return
      }

      // F6: fill exact cash amount (same as subtotal)
      if (e.key === 'F6') {
        e.preventDefault()
        fillExactCash()
        return
      }

      // F7: fill rounded cash amount (nearest 1000 above subtotal)
      if (e.key === 'F7') {
        e.preventDefault()
        fillRoundedCash()
        return
      }

      // F8: focus product search input
      if (e.key === 'F8') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      // F9: complete transaction
      if (e.key === 'F9') {
        e.preventDefault()
        void handleCheckout()
        return
      }

      // Alt+X: clear cart quickly
      if (e.altKey && key === 'x') {
        if (cart.length > 0) {
          e.preventDefault()
          setCart([])
          setPaidAmount('')
          toast.success('Keranjang dikosongkan')
        }
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [cart.length, fillExactCash, fillRoundedCash, handleCheckout, receipt])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header with scan and search */}
      <header className="bg-gradient-to-r from-sky-500 to-indigo-600 shadow-lg px-6 py-4 flex-none">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white drop-shadow-sm">💰 Kasir</h1>
            <p className="text-sm text-sky-100">Scan barcode atau cari produk</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Product Search Input */}
            <div className="relative">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border-0 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  ref={searchInputRef}
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 bg-transparent border-0 focus-visible:ring-0 px-0"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {searchQuery && (
                <div className="absolute z-10 right-0 mt-2 w-96 bg-white border rounded-lg shadow-lg max-h-80 overflow-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-slate-500">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600"></div>
                      <div className="mt-2 text-sm">Mencari produk...</div>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm">Tidak ada produk ditemukan</div>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {searchResults.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => {
                            if (product.stock > 0) {
                              addToCart(product)
                              setSearchQuery('')
                              setSearchResults([])
                            } else {
                              toast.error(`${product.name} stok habis`)
                            }
                          }}
                          className={`p-3 hover:bg-sky-50 cursor-pointer transition-colors ${product.stock === 0 ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-slate-900">{product.name}</div>
                              <div className="text-sm text-slate-500 mt-1">
                                {product.barcode && <span className="mr-3">Barcode: {product.barcode}</span>}
                                <span className={`font-medium ${product.stock === 0 ? 'text-red-600' : product.stock < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                                  Stok: {product.stock}
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="font-semibold text-sky-600">{fmt.format(product.price)}</div>
                              {product.stock === 0 ? (
                                <div className="text-xs text-red-600 mt-1">Habis</div>
                              ) : (
                                <div className="text-xs text-slate-500 mt-1">Klik untuk tambah</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Barcode Scanner Input */}
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border-0 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <Input 
                ref={barcodeInputRef}
                placeholder="Scan barcode..." 
                value={barcode} 
                onChange={(e) => setBarcode(e.target.value)} 
                onKeyDown={handleBarcodeKeyDown}
                className="w-48 bg-transparent border-0 focus-visible:ring-0 px-0" 
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content: Cart Table + Payment */}
      <main className="flex-1 overflow-hidden px-6 py-4">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Side: Cart and Manual Input */}
          <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
            {/* Manual Product Input */}
            <div className="bg-white rounded-lg border p-4 flex-none">
              <h3 className="font-semibold text-slate-900 mb-3">Tambah Produk Manual</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Nama produk..."
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addManualToCart()
                    }
                  }}
                />
                <Input
                  type="number"
                  placeholder="Harga (IDR)..."
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addManualToCart()
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button onClick={addManualToCart} className="flex-1 bg-sky-600 hover:bg-sky-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { setManualName(''); setManualPrice('') }}
                    disabled={!manualName && !manualPrice}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </div>

            {/* Cart Table */}
            <div className="flex-1 bg-white rounded-lg border flex flex-col min-h-0 overflow-hidden">
              <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between flex-none">
                <h2 className="font-semibold text-slate-900">Keranjang Belanja</h2>
                <span className="text-sm text-slate-500">{cart.length} item</span>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0">
              {cart.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-slate-500 text-sm">Keranjang kosong</p>
                    <p className="text-slate-400 text-xs mt-1">Scan barcode untuk menambahkan produk</p>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Produk</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider w-32">Harga</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider w-40">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider w-32">Subtotal</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((line, idx) => (
                      <tr key={line.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-sky-50/50 transition-colors`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{line.product?.name ?? line.name}</div>
                          {line.product && (
                            <div className="text-xs text-slate-500 mt-1">Stok: {line.product.stock}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{fmt.format(line.price)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => updateQty(line.id, line.qty - 1)}
                              className="h-7 w-7 p-0"
                            >
                              -
                            </Button>
                            <input 
                              aria-label={`Qty ${line.product?.name ?? line.name}`} 
                              value={String(line.qty)} 
                              onChange={(e) => updateQty(line.id, Number(e.target.value || 1))} 
                              className="w-16 border text-center rounded px-2 py-1 text-sm"
                            />
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => updateQty(line.id, line.qty + 1)}
                              className="h-7 w-7 p-0"
                            >
                              +
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt.format(line.price * line.qty)}</td>
                        <td className="px-4 py-3 text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeLine(line.id)} 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            </div>
          </div>

          {/* Right Side: Payment Section */}
          <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden">
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-lg border-0 p-6 flex-none">
              {/* Total Summary */}
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-sky-500 to-indigo-500 rounded-full"></span>
                Ringkasan
              </h3>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">{fmt.format(subtotal)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-lg text-sky-600">{fmt.format(subtotal)}</span>
                </div>
              </div>

              {/* Payment Input */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Pembayaran</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Jumlah Tunai</label>
                    <Input 
                      ref={paymentInputRef}
                      type="number" 
                      placeholder="Masukkan jumlah tunai..." 
                      value={paidAmount === '' ? '' : paidAmount} 
                      onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void handleCheckout()
                        }
                      }}
                      className="text-lg h-12"
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      Shortcut: <span className="font-medium">Enter</span> selesai, <span className="font-medium">F2</span> barcode, <span className="font-medium">F4</span> tunai, <span className="font-medium">F6</span> tunai pas, <span className="font-medium">F7</span> tunai bulat, <span className="font-medium">F8</span> cari, <span className="font-medium">F9</span> bayar, <span className="font-medium">Alt+X</span> hapus semua.
                    </div>
                  </div>
                  
                  {paidAmount !== '' && (
                    <div className={`p-3 rounded-lg ${paidAmount >= subtotal ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      {paidAmount >= subtotal ? (
                        <div>
                          <div className="text-xs text-green-700 font-medium">Kembalian</div>
                          <div className="text-2xl font-bold text-green-700">{fmt.format(paidAmount - subtotal)}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs text-red-700 font-medium">Kurang</div>
                          <div className="text-2xl font-bold text-red-700">{fmt.format(subtotal - paidAmount)}</div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-2">
                    <Button 
                      onClick={handleCheckout} 
                      disabled={isSubmitting || cart.length === 0 || paidAmount === '' || Number(paidAmount) < subtotal} 
                      className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-lg h-14 shadow-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {isSubmitting ? 'Memproses...' : 'Selesaikan Transaksi'}
                    </Button>
                    <Button 
                      onClick={() => { setCart([]); setPaidAmount(''); toast.success('Keranjang dikosongkan') }} 
                      variant="outline"
                      className="w-full"
                      disabled={cart.length === 0}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Hapus Semua
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
                    if (!res.ok) {
                      const json = await res.json().catch(() => ({}))
                      toast.error(json?.error || 'Gagal mencetak struk')
                      return
                    }
                    toast.success('Struk sedang dicetak...')
                  } catch (err) {
                    console.error(err)
                    toast.error('Gagal menghubungi server cetak')
                  }
                }}>Cetak Struk</Button>
              </div>
            </div>

            <div className="mt-4">
              <div className="space-y-2">
                {receipt.items.map((it: ReceiptItem) => (
                  <div key={it.id} className="flex justify-between">
                    <div>{it.product?.name || it.name || 'Produk'} x{it.quantity}</div>
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

      {/* Camera Scanner Modal */}
      <BarcodeCameraScanner
        open={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanned={(detectedBarcode) => {
          setBarcode(detectedBarcode)
          handleBarcodeSubmit(detectedBarcode)
          setShowCameraScanner(false)
        }}
      />
    </div>
  )
}
