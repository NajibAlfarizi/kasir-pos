"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

type TxItem = { id: number; product?: { id: number; name: string } | null; quantity: number; subtotal: number }
type Tx = { id: number; total: number; paid: number; change: number; createdAt: string; items: TxItem[]; no?: number }

export default function TransaksiPage() {
  const [data, setData] = React.useState<Tx[]>([])
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
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
  }, [page, perPage, from, to])

  React.useEffect(() => { fetchList() }, [fetchList])

  const exportCSV = () => {
    const rows = ['no,createdAt,total,paid,change']
    for (const t of data) rows.push(`${t.no || ''},"${t.createdAt}",${t.total},${t.paid},${t.change}`)
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transaksi_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

  // compact date format to reduce width
  const dateFmt = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Riwayat Transaksi</h1>
            <p className="text-sm text-muted-foreground">Lihat, ekspor, dan cetak transaksi.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-28 max-w-[110px] h-8 px-2" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-28 max-w-[110px] h-8 px-2" />
            <Input placeholder="Cari" value={""} onChange={() => {}} className="hidden md:block w-36 bg-slate-50 h-8 px-2" />
            <Button size="sm" onClick={() => { setPage(1); fetchList() }} className="px-3 py-1">Filter</Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="px-3 py-1">CSV</Button>
            <Button variant="ghost" size="sm" onClick={() => fetchList()} className="px-2 py-1">⟳</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-3 border-b">
          <div className="text-sm text-slate-600">Daftar transaksi</div>
        </div>
        <div className="p-2">
          <div className="overflow-x-auto">
            <Table className="min-w-full table-fixed text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-2 w-12">No</TableHead>
                  <TableHead className="px-3 py-2 w-48">Tanggal</TableHead>
                  <TableHead className="px-3 py-2 w-28 text-right">Total</TableHead>
                  <TableHead className="px-3 py-2 w-28 text-right hidden sm:table-cell">Bayar</TableHead>
                  <TableHead className="px-3 py-2 w-28 text-right hidden md:table-cell">Kembali</TableHead>
                  <TableHead className="px-3 py-2 w-28 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((t) => (
                  <TableRow key={t.id} className="align-top">
                    <TableCell className="px-3 py-3 align-top">{t.no ?? ''}</TableCell>
                    <TableCell className="px-3 py-3 align-top truncate max-w-[220px]">{dateFmt.format(new Date(t.createdAt))}</TableCell>
                    <TableCell className="px-3 py-3 text-right align-top">{fmt.format(t.total)}</TableCell>
                    <TableCell className="px-3 py-3 text-right align-top hidden sm:table-cell">{fmt.format(t.paid)}</TableCell>
                    <TableCell className="px-3 py-3 text-right align-top hidden md:table-cell">{fmt.format(t.change)}</TableCell>
                    <TableCell className="px-3 py-3 text-right align-top">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" onClick={() => setDetail(t)} className="px-3 py-1">Detail</Button>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          try {
                            const res = await fetch(`/api/print/transaction/${t.id}`, { method: 'POST' })
                            if (!res.ok) throw new Error('Gagal mencetak')
                            toast.success('Kirim cetak terkirim')
                          } catch (err) {
                            console.error(err)
                            toast.error('Gagal mengirim cetak')
                          }
                        }}>
                          Cetak
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {data.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">Tidak ada transaksi</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Menampilkan {data.length} dari {total} transaksi</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
              <div className="px-2">Halaman {page} / {totalPages}</div>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="border px-2 py-1 rounded">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4 z-50">
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Detail Transaksi #{detail.no ?? ''}</h3>
                <div className="text-sm text-slate-500">{dateFmt.format(new Date(detail.createdAt))}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setDetail(null)}>Tutup</Button>
                <Button size="sm" onClick={async () => {
                  try {
                    const res = await fetch(`/api/print/transaction/${detail.id}`, { method: 'POST' })
                    if (!res.ok) throw new Error('Gagal mencetak')
                    toast.success('Kirim cetak terkirim')
                  } catch (err) {
                    console.error(err)
                    toast.error('Gagal mengirim cetak')
                  }
                }}>Cetak</Button>
              </div>
            </div>
            <Separator />
            <div className="mt-4 space-y-2">
              {detail.items.map(it => (
                <div key={it.id} className="flex justify-between">
                  <div className="text-sm">{it.product?.name || 'Produk'} x{it.quantity}</div>
                  <div className="text-sm">{fmt.format(it.subtotal)}</div>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between"><div>Total</div><div>{fmt.format(detail.total)}</div></div>
                <div className="flex justify-between"><div>Bayar</div><div>{fmt.format(detail.paid)}</div></div>
                <div className="flex justify-between"><div>Kembali</div><div>{fmt.format(detail.change)}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}