"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { RotateCw, Printer, ExternalLink } from 'lucide-react'
import { formatRupiah, formatDateTime } from '@/lib/format'

type Tx = { id: number; total: number | null; paid: number | null; change: number | null; createdAt: string; paymentMethod?: string }

export default function RecentTransactionsTable({ limit = 8 }: { limit?: number }) {
  const [rows, setRows] = useState<Tx[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/recent-transactions?limit=${limit}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setRows(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat transaksi terbaru')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { fetchRows() }, [fetchRows])

  const handlePrint = async (id: number) => {
    try {
      const res = await fetch(`/api/print/transaction/${id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Gagal mengirim cetak')
      toast.success('Permintaan cetak dikirim')
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengirim cetak')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between p-2">
        <div className="text-xs font-medium text-slate-500">Menampilkan {rows.length} transaksi terbaru</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => fetchRows()} disabled={loading} className="h-8 px-2 text-slate-600">
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Table className="min-w-full table-fixed text-sm">
        <TableHeader>
          <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
            <TableHead className="px-3 py-2 w-12 font-semibold text-slate-600">No</TableHead>
            <TableHead className="px-3 py-2 w-48 font-semibold text-slate-600">Tanggal</TableHead>
            <TableHead className="px-3 py-2 w-28 text-right font-semibold text-slate-600">Total</TableHead>
            <TableHead className="px-3 py-2 w-28 text-right hidden sm:table-cell font-semibold text-slate-600">Bayar</TableHead>
            <TableHead className="px-3 py-2 w-28 text-right hidden md:table-cell font-semibold text-slate-600">Kembali</TableHead>
            <TableHead className="px-3 py-2 w-28 text-right font-semibold text-slate-600">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t, idx) => (
            <TableRow key={t.id} className="align-top hover:bg-slate-50/50 transition-colors">
              <TableCell className="px-3 py-3 align-top font-medium text-slate-500">{idx + 1}</TableCell>
              <TableCell className="px-3 py-3 align-top truncate max-w-[220px] font-medium text-slate-700">{formatDateTime(t.createdAt)}</TableCell>
              <TableCell className="px-3 py-3 text-right align-top font-bold text-slate-900">{formatRupiah(t.total ?? 0)}</TableCell>
              <TableCell className="px-3 py-3 text-right align-top hidden sm:table-cell text-slate-600">{formatRupiah(t.paid ?? 0)}</TableCell>
              <TableCell className="px-3 py-3 text-right align-top hidden md:table-cell text-slate-600">{formatRupiah(t.change ?? 0)}</TableCell>
              <TableCell className="px-3 py-3 text-right align-top">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/transaksi`} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                    <ExternalLink className="w-3 h-3" />
                    Lihat
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => handlePrint(t.id)} className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900">
                    <Printer className="w-3 h-3 mr-1" />
                    Cetak
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}

          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6">Belum ada transaksi</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
