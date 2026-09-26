"use client"

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import BarcodeCameraScanner from '../components/BarcodeCameraScanner'
import { toast } from 'sonner'
import {
  ShoppingCart,
  ShoppingBag,
  Search,
  Barcode,
  Camera,
  Plus,
  Minus,
  Trash2,
  Banknote,
  QrCode,
  CheckCircle2,
  Info,
  Printer,
  X,
  PlusCircle,
  RotateCcw,
} from 'lucide-react'
import { formatDateTime } from '@/lib/format'

type Product = { id: number; name: string; price: number; stock: number; barcode?: string }
type CartLine = { id: string; product?: Product; productId?: number; name?: string; qty: number; price: number }
type ReceiptItem = { id: number; product?: Product | null; name?: string | null; quantity: number; subtotal: number }
type Receipt = { id: number; total: number; paid: number; change: number; paymentMethod?: string; createdAt: string; items: ReceiptItem[] }

export default function KasirPage() {
  const [barcode, setBarcode] = React.useState('')
  const [cart, setCart] = React.useState<CartLine[]>([])
  const [selectedCartId, setSelectedCartId] = React.useState<string | null>(null)
  const [paidAmount, setPaidAmount] = React.useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = React.useState<'CASH' | 'QRIS'>('CASH')
  const [qrisImage, setQrisImage] = React.useState<string>('')
  const [showQrisModal, setShowQrisModal] = React.useState(false)
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

  // Deterministic currency formatter to avoid SSR/client hydration mismatches
  const fmt = React.useMemo(() => ({
    format: (amount: number) => {
      const num = Math.round(Number(amount) || 0)
      return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
  }), [])

  // load settings to determine if client-side auto-print should be triggered and load qrisImage
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
        if (json['qrisImage']) {
          setQrisImage(json['qrisImage'])
        }
      } catch (e) {
        console.warn('Failed to load settings', e)
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
        setSelectedCartId(updated.id)
        return cloned
      }

      const newItem = { id: `p-${p.id}`, product: p, productId: p.id, qty: 1, price: p.price }
      setSelectedCartId(newItem.id)
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

  const removeLine = (lineId: string) => {
    setCart(c => {
      const next = c.filter(l => l.id !== lineId)
      if (selectedCartId === lineId) {
        setSelectedCartId(next[0]?.id || null)
      }
      return next
    })
  }

  const addManualToCart = () => {
    const name = manualName.trim()
    const price = Number(manualPrice)
    if (!name) return toast.error('Nama produk wajib diisi')
    if (!Number.isInteger(price) || price < 0) return toast.error('Harga harus bilangan bulat >= 0')
    const line: CartLine = { id: `m-${Date.now()}`, name, qty: 1, price }
    setCart(c => [line, ...c])
    setSelectedCartId(line.id)
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
    if (cart.length === 0) return toast.error('Keranjang kosong')

    if (paymentMethod === 'CASH') {
      if (paidAmount === '' || typeof paidAmount !== 'number') return toast.error('Masukkan jumlah tunai')
      if (Number(paidAmount) < subtotal) return toast.error('Jumlah tunai kurang')
    }

    const payload = {
      items: cart.map(l => l.productId ? ({ productId: l.productId, quantity: l.qty, price: l.price }) : ({ name: l.name, quantity: l.qty, price: l.price })),
      paid: paymentMethod === 'QRIS' ? subtotal : Number(paidAmount),
      paymentMethod,
    }
    try {
      setIsSubmitting(true)
      const res = await fetch('/api/transaksi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error || 'Gagal melakukan transaksi')
        return
      }

      toast.success(paymentMethod === 'QRIS' ? 'Transaksi QRIS berhasil!' : 'Transaksi tunai berhasil!')
      // reset cart and show receipt
      setCart([])
      setPaidAmount('')
      setPaymentMethod('CASH')
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
  }, [autoPrintEnabled, cart, isSubmitting, paidAmount, paymentMethod, printCopies, subtotal])

  const handleCheckout = React.useCallback(async () => {
    if (cart.length === 0) return toast.error('Cart kosong')
    // submitting inline handled by submitPayment
    await submitPayment()
  }, [cart.length, submitPayment])

  const fillExactCash = React.useCallback(() => {
    if (cart.length === 0) return
    setPaymentMethod('CASH')
    setPaidAmount(subtotal)
    paymentInputRef.current?.focus()
    toast.success('Tunai diisi pas sesuai total')
  }, [cart.length, subtotal])

  const fillRoundedCash = React.useCallback(() => {
    if (cart.length === 0) return
    setPaymentMethod('CASH')
    const rounded = Math.ceil(subtotal / 1000) * 1000
    setPaidAmount(rounded)
    paymentInputRef.current?.focus()
    toast.success('Tunai dibulatkan ke atas (ribuan terdekat)')
  }, [cart.length, subtotal])

  const effectiveSelectedId = React.useMemo(() => {
    if (selectedCartId && cart.some(l => l.id === selectedCartId)) {
      return selectedCartId
    }
    return cart[0]?.id || null
  }, [cart, selectedCartId])

  const incrementSelectedQty = React.useCallback(() => {
    if (cart.length === 0) {
      toast.info('Keranjang masih kosong')
      return
    }
    const targetId = effectiveSelectedId || cart[0]?.id
    if (!targetId) return
    const line = cart.find(l => l.id === targetId)
    if (!line) return

    if (line.product && line.qty >= line.product.stock) {
      toast.error(`Stok maksimal ${line.product.name} tercapai (${line.product.stock} pcs)`)
      return
    }

    updateQty(targetId, line.qty + 1)
    toast.success(`${line.product?.name || line.name}: Qty ${line.qty + 1}`, { duration: 1000 })
  }, [cart, effectiveSelectedId])

  const decrementSelectedQty = React.useCallback(() => {
    if (cart.length === 0) {
      toast.info('Keranjang masih kosong')
      return
    }
    const targetId = effectiveSelectedId || cart[0]?.id
    if (!targetId) return
    const line = cart.find(l => l.id === targetId)
    if (!line) return

    if (line.qty <= 1) {
      toast.info(`Qty minimal 1. Klik ikon hapus jika ingin membatalkan.`, { duration: 1200 })
      return
    }

    updateQty(targetId, line.qty - 1)
    toast.success(`${line.product?.name || line.name}: Qty ${line.qty - 1}`, { duration: 1000 })
  }, [cart, effectiveSelectedId])

  const selectPrevItem = React.useCallback(() => {
    if (cart.length <= 1) return
    const currentIndex = cart.findIndex(l => l.id === effectiveSelectedId)
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : cart.length - 1
    setSelectedCartId(cart[prevIndex].id)
  }, [cart, effectiveSelectedId])

  const selectNextItem = React.useCallback(() => {
    if (cart.length <= 1) return
    const currentIndex = cart.findIndex(l => l.id === effectiveSelectedId)
    const nextIndex = currentIndex < cart.length - 1 ? currentIndex + 1 : 0
    setSelectedCartId(cart[nextIndex].id)
  }, [cart, effectiveSelectedId])

  React.useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // Esc: close receipt modal or qris modal quickly
      if (key === 'escape') {
        if (receipt) {
          e.preventDefault()
          setReceipt(null)
          return
        }
        if (showQrisModal) {
          e.preventDefault()
          setShowQrisModal(false)
          return
        }
      }

      // F2: focus barcode input
      if (e.key === 'F2') {
        e.preventDefault()
        barcodeInputRef.current?.focus()
        return
      }

      // F3: toggle payment method (Cash <-> QRIS)
      if (e.key === 'F3') {
        e.preventDefault()
        setPaymentMethod(prev => {
          const next = prev === 'CASH' ? 'QRIS' : 'CASH'
          if (next === 'QRIS') {
            toast.info('Metode pembayaran: QRIS')
          } else {
            toast.info('Metode pembayaran: Tunai')
            setTimeout(() => paymentInputRef.current?.focus(), 50)
          }
          return next
        })
        return
      }

      // F4: focus payment input (and switch to CASH)
      if (e.key === 'F4') {
        e.preventDefault()
        setPaymentMethod('CASH')
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

      // F10: Tambah Qty (+1) pada produk terpilih
      if (e.key === 'F10') {
        e.preventDefault()
        incrementSelectedQty()
        return
      }

      // F11: Kurangi Qty (-1) pada produk terpilih
      if (e.key === 'F11') {
        e.preventDefault()
        decrementSelectedQty()
        return
      }

      // Ctrl + ArrowUp / Alt + ArrowUp: Tambah Qty
      if ((e.ctrlKey || e.altKey) && (e.key === 'ArrowUp' || e.key === '+' || e.key === '=' || e.code === 'NumpadAdd')) {
        e.preventDefault()
        incrementSelectedQty()
        return
      }

      // Ctrl + ArrowDown / Alt + ArrowDown: Kurangi Qty
      if ((e.ctrlKey || e.altKey) && (e.key === 'ArrowDown' || e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract')) {
        e.preventDefault()
        decrementSelectedQty()
        return
      }

      // Alt+X: clear cart quickly
      if (e.altKey && key === 'x') {
        if (cart.length > 0) {
          e.preventDefault()
          setCart([])
          setPaidAmount('')
          toast.success('Keranjang dikosongkan')
          return
        }
      }

      // Single-key shortcuts when user is NOT typing inside a text field
      const target = e.target as HTMLElement
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if (!isInput) {
        if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
          e.preventDefault()
          incrementSelectedQty()
          return
        }
        if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
          e.preventDefault()
          decrementSelectedQty()
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          selectPrevItem()
          return
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          selectNextItem()
          return
        }
        if (e.key === 'Delete') {
          if (effectiveSelectedId) {
            e.preventDefault()
            const item = cart.find(l => l.id === effectiveSelectedId)
            removeLine(effectiveSelectedId)
            toast.info(`${item?.product?.name || item?.name || 'Item'} dihapus`)
            return
          }
        }
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [cart, decrementSelectedQty, effectiveSelectedId, fillExactCash, fillRoundedCash, handleCheckout, incrementSelectedQty, receipt, selectNextItem, selectPrevItem, showQrisModal])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header with scan and search */}
      <header className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 shadow-md px-6 py-3.5 flex-none">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md text-white border border-white/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Kasir Minimarket</h1>
              <p className="text-xs text-indigo-100">Scan barcode atau cari produk untuk transaksi baru</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Product Search Input */}
            <div className="relative">
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-indigo-200/50 shadow-xs">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <Input
                  ref={searchInputRef}
                  placeholder="Cari produk (F8)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isSubmitting}
                  className="w-44 bg-transparent border-0 focus-visible:ring-0 px-0 h-7 text-xs"
                />
              </div>
              
              {/* Search Results Dropdown */}
              {searchQuery && (
                <div className="absolute z-10 right-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-xl max-h-80 overflow-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-slate-500">
                      <Spinner className="mx-auto mb-2" />
                      <div className="text-xs">Mencari produk...</div>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      <Search className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                      <div className="text-xs font-medium text-slate-600">Tidak ada produk ditemukan</div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
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
                          className={`p-3 hover:bg-indigo-50/50 cursor-pointer transition-colors ${product.stock === 0 ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-slate-900 text-xs">{product.name}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {product.barcode && <span className="mr-3 font-mono">Barcode: {product.barcode}</span>}
                                <span className={`font-medium ${product.stock === 0 ? 'text-rose-600' : product.stock < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  Stok: {product.stock}
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="font-bold text-indigo-600 text-xs">{fmt.format(product.price)}</div>
                              {product.stock === 0 ? (
                                <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Habis</div>
                              ) : (
                                <div className="text-[10px] text-slate-400 mt-0.5">+ Tambah</div>
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
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-indigo-200/50 shadow-xs">
              <Barcode className="h-4 w-4 text-slate-400 shrink-0" />
              <Input 
                ref={barcodeInputRef}
                placeholder="Scan barcode (F2)..." 
                value={barcode} 
                onChange={(e) => setBarcode(e.target.value)} 
                onKeyDown={handleBarcodeKeyDown}
                disabled={isSubmitting}
                className="w-44 bg-transparent border-0 focus-visible:ring-0 px-0 h-7 text-xs" 
              />
            </div>

            {/* Camera scanner trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCameraScanner(true)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-9 rounded-lg px-2.5 text-xs"
              title="Scan Barcode via Kamera"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Kamera</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content: Cart Table + Payment */}
      <main className="flex-1 overflow-hidden px-6 py-4">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Side: Cart and Manual Input */}
          <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
            {/* Manual Product Input */}
            <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 p-4 flex-none">
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Tambah Produk Manual</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Nama produk manual..."
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  disabled={isSubmitting}
                  className="h-9 rounded-lg border-slate-200 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addManualToCart()
                    }
                  }}
                />
                <Input
                  type="number"
                  placeholder="Harga (Rp)..."
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  disabled={isSubmitting}
                  className="h-9 rounded-lg border-slate-200 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addManualToCart()
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button onClick={addManualToCart} disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 text-xs font-medium">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Tambah
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { setManualName(''); setManualPrice('') }}
                    disabled={(!manualName && !manualPrice) || isSubmitting}
                    className="h-9 rounded-lg text-xs border-slate-200"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </div>

            {/* Cart Table */}
            <div className="flex-1 bg-white rounded-xl shadow-2xs border border-slate-200/80 flex flex-col min-h-0 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 flex-none">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  <h2 className="font-semibold text-slate-900 text-sm">Keranjang Belanja</h2>
                  <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    {cart.length} item
                  </span>
                </div>

                {/* Keyboard Shortcut Hints for Cashier */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="hidden sm:inline text-slate-400">Shortcut Qty:</span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-700 shadow-2xs">
                    +
                  </kbd>
                  <span className="text-slate-400">/</span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-700 shadow-2xs">
                    F10
                  </kbd>
                  <span className="font-medium text-slate-600 mr-2">+1 Qty</span>
                  
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-700 shadow-2xs">
                    -
                  </kbd>
                  <span className="text-slate-400">/</span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-700 shadow-2xs">
                    F11
                  </kbd>
                  <span className="font-medium text-slate-600">-1 Qty</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0">
              {cart.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-600 text-sm font-medium">Keranjang masih kosong</p>
                    <p className="text-slate-400 text-xs mt-0.5">Scan barcode produk atau ketik di kolom cari untuk mulai transaksi</p>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Produk</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Harga</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-40">Qty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Subtotal</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((line, idx) => {
                      const isSelected = line.id === effectiveSelectedId
                      return (
                        <tr
                          key={line.id}
                          onClick={() => setSelectedCartId(line.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/80 border-l-4 border-l-indigo-600 ring-1 ring-indigo-200/50'
                              : idx % 2 === 0 ? 'bg-white border-l-4 border-l-transparent' : 'bg-slate-50/40 border-l-4 border-l-transparent'
                          } hover:bg-indigo-50/40`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-slate-900 text-sm">{line.product?.name ?? line.name}</div>
                              {isSelected && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white font-bold text-[9px] uppercase tracking-wider">
                                  Pilihan
                                </span>
                              )}
                            </div>
                            {line.product && (
                              <div className="text-xs text-slate-500 mt-0.5">Stok tersedia: {line.product.stock}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 text-sm font-medium">{fmt.format(line.price)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => { e.stopPropagation(); updateQty(line.id, line.qty - 1) }}
                                disabled={isSubmitting}
                                title="Kurangi Qty (- / F11)"
                                className="h-7 w-7 p-0 rounded-md border-slate-200 hover:bg-slate-100"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <input 
                                aria-label={`Qty ${line.product?.name ?? line.name}`} 
                                value={String(line.qty)} 
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateQty(line.id, Number(e.target.value || 1))} 
                                disabled={isSubmitting}
                                className="w-14 border border-slate-200 text-center rounded-md px-1 py-0.5 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-500 bg-white"
                              />
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => { e.stopPropagation(); updateQty(line.id, line.qty + 1) }}
                                disabled={isSubmitting}
                                title="Tambah Qty (+ / F10)"
                                className="h-7 w-7 p-0 rounded-md border-slate-200 hover:bg-slate-100"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">{fmt.format(line.price * line.qty)}</td>
                          <td className="px-4 py-3 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => { e.stopPropagation(); removeLine(line.id) }} 
                              disabled={isSubmitting}
                              title="Hapus produk"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0 rounded-md"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            </div>
          </div>

          {/* Right Side: Payment Section */}
          <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden">
            <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 p-5 flex-none">
              {/* Total Summary */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-semibold text-slate-900 text-sm">Ringkasan Pembayaran</h3>
                <span className="text-[11px] text-slate-400">Total belanja</span>
              </div>

              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Subtotal Belanja</span>
                  <span className="font-semibold text-slate-800">{fmt.format(subtotal)}</span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-slate-900">Total Tagihan</span>
                  <span className="font-black text-2xl text-indigo-600">{fmt.format(subtotal)}</span>
                </div>
              </div>

              {/* Payment Section */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="font-semibold text-slate-900 text-xs">Metode Pembayaran</h3>
                  <span className="text-[11px] text-slate-400">F3: Ganti Mode</span>
                </div>

                {/* Payment Method Switcher */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('CASH')
                      setTimeout(() => paymentInputRef.current?.focus(), 50)
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      paymentMethod === 'CASH'
                        ? 'bg-white text-sky-700 shadow-xs ring-1 ring-sky-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    Tunai (F4)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('QRIS')
                      setPaidAmount(subtotal)
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      paymentMethod === 'QRIS'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    QRIS (F3)
                  </button>
                </div>

                {paymentMethod === 'QRIS' ? (
                  <div className="space-y-4">
                    {/* QRIS Box */}
                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Mode QRIS Aktif</span>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-md">Uang Pas</span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-slate-500">Nominal QRIS</div>
                          <div className="text-xl font-bold text-emerald-700">{fmt.format(subtotal)}</div>
                        </div>
                        <div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowQrisModal(true)}
                            className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg h-8"
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1" />
                            {qrisImage ? 'QR Toko' : 'Info QRIS'}
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-emerald-900 bg-emerald-100/70 p-2.5 rounded-lg flex items-start gap-2">
                        <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight">Minta pelanggan scan QRIS sebesar <b>{fmt.format(subtotal)}</b>. Pastikan transaksi sukses di e-wallet/m-banking sebelum klik Selesai.</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <Button 
                        onClick={handleCheckout} 
                        disabled={isSubmitting || cart.length === 0} 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-base h-12 shadow-sm rounded-xl font-semibold transition-all"
                      >
                        {isSubmitting ? (
                          <>
                            <Spinner className="h-4 w-4 mr-2" />
                            Memproses QRIS...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Selesaikan Transaksi QRIS (F9)
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={() => { setCart([]); setPaidAmount(''); toast.success('Keranjang dikosongkan') }} 
                        variant="outline"
                        className="w-full h-9 rounded-lg text-xs border-slate-200 text-slate-600 hover:text-rose-600"
                        disabled={cart.length === 0 || isSubmitting}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Kosongkan Keranjang
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jumlah Uang Tunai</label>
                      <Input 
                        ref={paymentInputRef}
                        type="number" 
                        placeholder="Masukkan nominal tunai..." 
                        value={paidAmount === '' ? '' : paidAmount} 
                        onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void handleCheckout()
                          }
                        }}
                        disabled={isSubmitting}
                        className="text-base h-11 rounded-lg border-slate-200 font-semibold focus-visible:ring-indigo-500"
                      />
                      <div className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                        Shortcut: <span className="font-semibold text-slate-700">Enter</span> bayar, <span className="font-semibold text-indigo-600">F10 / [+]</span> +Qty, <span className="font-semibold text-indigo-600">F11 / [-]</span> -Qty, <span className="font-semibold text-slate-700">F2</span> scan, <span className="font-semibold text-slate-700">F3</span> QRIS, <span className="font-semibold text-slate-700">F4</span> tunai, <span className="font-semibold text-slate-700">F6</span> pas, <span className="font-semibold text-slate-700">F8</span> cari.
                      </div>
                    </div>
                    
                    {paidAmount !== '' && (
                      <div className={`p-3 rounded-xl border ${paidAmount >= subtotal ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                        {paidAmount >= subtotal ? (
                          <div>
                            <div className="text-[11px] text-emerald-700 font-medium">Uang Kembalian</div>
                            <div className="text-xl font-bold text-emerald-700">{fmt.format(paidAmount - subtotal)}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-[11px] text-rose-700 font-medium">Uang Kurang</div>
                            <div className="text-xl font-bold text-rose-700">{fmt.format(subtotal - paidAmount)}</div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-1">
                      <Button 
                        onClick={handleCheckout} 
                        disabled={isSubmitting || cart.length === 0 || paidAmount === '' || Number(paidAmount) < subtotal} 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-base h-12 shadow-sm rounded-xl font-semibold"
                      >
                        {isSubmitting ? (
                          <>
                            <Spinner className="h-4 w-4 mr-2" />
                            Memproses...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Selesaikan Transaksi (F9)
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={() => { setCart([]); setPaidAmount(''); toast.success('Keranjang dikosongkan') }} 
                        variant="outline"
                        className="w-full h-9 rounded-lg text-xs border-slate-200 text-slate-600 hover:text-rose-600"
                        disabled={cart.length === 0 || isSubmitting}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Kosongkan Keranjang
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Receipt modal */}
      {receipt && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg border border-slate-200/80 animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Struk Transaksi Selesai</h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">ID #{receipt.id} • {formatDateTime(receipt.createdAt)}</div>
                <div className="mt-1.5">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${receipt.paymentMethod === 'QRIS' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-sky-50 text-sky-800 border border-sky-200'}`}>
                    {receipt.paymentMethod === 'QRIS' ? <QrCode className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                    {receipt.paymentMethod === 'QRIS' ? 'PEMBAYARAN QRIS' : 'PEMBAYARAN TUNAI'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setReceipt(null) }} className="rounded-lg">Tutup</Button>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg" onClick={async () => {
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
                }}>
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Cetak Struk
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <div className="space-y-2">
                {receipt.items.map((it: ReceiptItem) => (
                  <div key={it.id} className="flex justify-between text-xs">
                    <div className="text-slate-800 font-medium">{it.product?.name || it.name || 'Produk'} x{it.quantity}</div>
                    <div className="font-semibold text-slate-900">{fmt.format(it.subtotal)}</div>
                  </div>
                ))}
                <div className="border-t border-slate-100 pt-3 mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Metode</span>
                    <span className="font-semibold text-slate-800">{receipt.paymentMethod === 'QRIS' ? 'QRIS' : 'Tunai'}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
                    <div>Total Belanja</div>
                    <div className="text-indigo-600">{fmt.format(receipt.total)}</div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <div>Jumlah Bayar</div>
                    <div>{fmt.format(receipt.paid)} {receipt.paymentMethod === 'QRIS' ? '(QRIS)' : ''}</div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <div>Kembalian</div>
                    <div>{fmt.format(receipt.change ?? 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer QRIS Modal */}
      {showQrisModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center border border-slate-200/80 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Scan QRIS Toko</h3>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowQrisModal(false)} className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 flex flex-col items-center justify-center min-h-[220px]">
              {qrisImage ? (
                <img src={qrisImage} alt="QRIS Toko" className="max-h-56 max-w-full rounded-lg object-contain shadow-xs" />
              ) : (
                <div className="space-y-2 py-4">
                  <div className="w-24 h-24 mx-auto bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
                    <QrCode className="w-12 h-12 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">Gunakan barcode stiker QRIS di meja kasir</p>
                  <p className="text-[11px] text-slate-400">Gambar QRIS toko dapat diunggah melalui menu Pengaturan</p>
                </div>
              )}
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
              <div className="text-xs text-emerald-800">Nominal yang harus dibayar</div>
              <div className="text-2xl font-black text-emerald-700">{fmt.format(subtotal)}</div>
            </div>

            <Button
              onClick={() => setShowQrisModal(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-semibold"
            >
              Tutup
            </Button>
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
