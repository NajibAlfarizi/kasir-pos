"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Receipt,
  Banknote,
  QrCode,
  Calendar,
  Filter,
  Download,
  RotateCw,
  Printer,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatDateTime, formatRupiah } from '@/lib/format'

type TxItem = { id: number; product?: { id: number; name: string } | null; name?: string | null; quantity: number; subtotal: number }
type Tx = { id: number; total: number; paid: number; change: number; paymentMethod?: string; createdAt: string; items: TxItem[]; no?: number }

export default function TransaksiPage() {
  const [data, setData] = React.useState<Tx[]>([])
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [methodFilter, setMethodFilter] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [detail, setDetail] = React.useState<Tx | null>(null)

  const fetchList = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('perPage', String(perPage))
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (methodFilter) params.set('paymentMethod', methodFilter)
      const res = await fetch(`/api/transaksi?${params.toString()}`)
      const json = await res.json()
      const rows: Tx[] = (json.data || []).map((t: Tx, i: number) => ({ ...t, no: (page - 1) * perPage + i + 1 }))
      setData(rows)
      setTotal(json.total || 0)
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat transaksi')
    } finally {
      setLoading(false)
    }
  }, [page, perPage, from, to, methodFilter])

  React.useEffect(() => { fetchList() }, [fetchList])

  const exportCSV = () => {
    const rows = ['no,createdAt,paymentMethod,total,paid,change']
    for (const t of data) rows.push(`${t.no || ''},"${t.createdAt}","${t.paymentMethod || 'CASH'}",${t.total},${t.paid},${t.change}`)
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transaksi_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  // Deterministic currency formatter to avoid SSR/client hydration mismatches
  const fmt = React.useMemo(() => ({
    format: (amount: number) => {
      const num = Math.round(Number(amount) || 0)
      return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
  }), [])


  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                <Receipt className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                Riwayat Transaksi
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Daftar seluruh transaksi penjualan, cetak ulang struk, dan ekspor data CSV
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700 font-semibold shadow-2xs transition-all h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchList()}
              disabled={loading}
              className="bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700 shadow-2xs h-9 px-3"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            </Button>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Periode:</span>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-36 h-9 text-xs border-slate-300"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-36 h-9 text-xs border-slate-300"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Metode:</span>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="border border-slate-300 bg-white h-9 px-2.5 rounded-md text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Semua Metode</option>
                <option value="CASH">Tunai (Cash)</option>
                <option value="QRIS">Non-Tunai (QRIS)</option>
              </select>
            </div>

            <Button
              size="sm"
              onClick={() => { setPage(1); fetchList() }}
              className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-2xs"
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Terapkan Filter
            </Button>
          </div>

          <div className="text-xs font-medium text-slate-500">
            Total {total} transaksi tercatat
          </div>
        </div>

        {/* Transactions Table Card */}
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-full table-fixed text-sm">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="px-4 py-3 w-14 font-semibold text-slate-600">No</TableHead>
                  <TableHead className="px-4 py-3 w-48 font-semibold text-slate-600">Tanggal & Waktu</TableHead>
                  <TableHead className="px-4 py-3 w-32 font-semibold text-slate-600">Metode</TableHead>
                  <TableHead className="px-4 py-3 w-36 text-right font-semibold text-slate-600">Total Belanja</TableHead>
                  <TableHead className="px-4 py-3 w-32 text-right hidden sm:table-cell font-semibold text-slate-600">Bayar</TableHead>
                  <TableHead className="px-4 py-3 w-32 text-right hidden md:table-cell font-semibold text-slate-600">Kembali</TableHead>
                  <TableHead className="px-4 py-3 w-40 text-right font-semibold text-slate-600">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((t) => (
                  <TableRow key={t.id} className="align-middle hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-4 py-3 font-medium text-slate-500">{t.no ?? ''}</TableCell>
                    <TableCell className="px-4 py-3 truncate max-w-[200px] text-slate-700 font-medium">
                      {formatDateTime(t.createdAt)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        t.paymentMethod === 'QRIS'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {t.paymentMethod === 'QRIS' ? (
                          <>
                            <QrCode className="w-3 h-3 text-emerald-600" />
                            QRIS
                          </>
                        ) : (
                          <>
                            <Banknote className="w-3 h-3 text-sky-600" />
                            Tunai
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-bold text-slate-900">{fmt.format(t.total)}</TableCell>
                    <TableCell className="px-4 py-3 text-right hidden sm:table-cell text-slate-600">{fmt.format(t.paid)}</TableCell>
                    <TableCell className="px-4 py-3 text-right hidden md:table-cell text-slate-600">{fmt.format(t.change ?? 0)}</TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetail(t)}
                          className="h-8 px-2.5 text-xs font-semibold text-indigo-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Detail
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/print/transaction/${t.id}`, { method: 'POST' })
                              if (!res.ok) throw new Error('Gagal mencetak')
                              toast.success('Kirim cetak terkirim')
                            } catch (err) {
                              console.error(err)
                              toast.error('Gagal mengirim cetak')
                            }
                          }}
                          className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          Cetak
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {data.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Tidak ada transaksi pada filter ini
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/40">
            <div className="text-xs text-slate-500">
              Menampilkan {data.length} dari {total} transaksi
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-2.5 text-xs border-slate-200 bg-white"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Sebelumnya
              </Button>
              <div className="text-xs font-medium text-slate-700 px-2">
                Halaman {page} dari {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 px-2.5 text-xs border-slate-200 bg-white"
              >
                Selanjutnya
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                className="border border-slate-300 bg-white h-8 px-2 rounded-md text-xs font-medium text-slate-700"
              >
                <option value={10}>10 / hal</option>
                <option value={20}>20 / hal</option>
                <option value={50}>50 / hal</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transaction Detail Modal */}
        {detail && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-slate-900">Detail Transaksi #{detail.no ?? ''}</h3>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{formatDateTime(detail.createdAt)}</div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      detail.paymentMethod === 'QRIS'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-sky-50 text-sky-800 border-sky-300'
                    }`}>
                      {detail.paymentMethod === 'QRIS' ? (
                        <>
                          <QrCode className="w-3 h-3 text-emerald-600" />
                          PEMBAYARAN QRIS
                        </>
                      ) : (
                        <>
                          <Banknote className="w-3 h-3 text-sky-600" />
                          PEMBAYARAN TUNAI
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/print/transaction/${detail.id}`, { method: 'POST' })
                        if (!res.ok) throw new Error('Gagal mencetak')
                        toast.success('Kirim cetak terkirim')
                      } catch (err) {
                        console.error(err)
                        toast.error('Gagal mengirim cetak')
                      }
                    }}
                    className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Cetak
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDetail(null)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {detail.items.map(it => (
                  <div key={it.id} className="flex justify-between items-center text-sm py-1 border-b border-slate-50">
                    <div>
                      <div className="font-medium text-slate-800">{it.product?.name || it.name || 'Produk'}</div>
                      <div className="text-xs text-slate-400">{it.quantity} x {fmt.format((it.subtotal || 0) / (it.quantity || 1))}</div>
                    </div>
                    <div className="font-semibold text-slate-900">{fmt.format(it.subtotal)}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-3 mt-3 space-y-1.5 bg-slate-50/70 p-3 rounded-xl">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Metode Pembayaran</span>
                  <span className="font-semibold text-slate-800">{detail.paymentMethod === 'QRIS' ? 'QRIS' : 'Tunai'}</span>
                </div>
                <div className="flex justify-between font-extrabold text-base text-slate-900 pt-1 border-t border-slate-200/60">
                  <span>Total Transaksi</span>
                  <span className="text-indigo-600">{fmt.format(detail.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Jumlah Bayar</span>
                  <span className="font-medium">{fmt.format(detail.paid)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Kembalian</span>
                  <span className="font-medium">{fmt.format(detail.change ?? 0)}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetail(null)}
                  className="border-slate-200 text-xs"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}