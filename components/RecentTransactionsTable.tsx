"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'

type Tx = { id: number; total: number | null; paid: number | null; change: number | null; createdAt: string }

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

  const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })
  const dateFmt = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })

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
        <div className="text-sm text-slate-600">Menampilkan {rows.length} transaksi terbaru</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => fetchRows()} disabled={loading}>⟳</Button>
        </div>
      </div>

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
          {rows.map((t, idx) => (
            <TableRow key={t.id} className="align-top">
              <TableCell className="px-3 py-3 align-top">{idx + 1}</TableCell>
              <TableCell className="px-3 py-3 align-top truncate max-w-[220px]">{dateFmt.format(new Date(t.createdAt))}</TableCell>
              <TableCell className="px-3 py-3 text-right align-top">{fmt.format(t.total ?? 0)}</TableCell>
              <TableCell className="px-3 py-3 text-right align-top hidden sm:table-cell">{fmt.format(t.paid ?? 0)}</TableCell>
              <TableCell className="px-3 py-3 text-right align-top hidden md:table-cell">{fmt.format(t.change ?? 0)}</TableCell>
              <TableCell className="px-3 py-3 text-right align-top">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/transaksi`} className="text-sm text-sky-600 hover:underline">Lihat</Link>
                  <Button size="sm" variant="ghost" onClick={() => handlePrint(t.id)}>Cetak</Button>
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
