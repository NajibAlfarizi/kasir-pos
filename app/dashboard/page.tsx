import React from 'react'
import DashboardCharts from '@/components/DashboardCharts'
import prisma from '@/lib/prisma'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import Link from 'next/link'

function fmtCurrency(v: number) {
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
  } catch {
    return `Rp ${v}`
  }
}

export default async function DashboardPage() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const salesTodayAgg = await prisma.transaction.aggregate({
    _sum: { total: true },
    where: { createdAt: { gte: startOfDay } },
  })

  const transactionsToday = await prisma.transaction.count({ where: { createdAt: { gte: startOfDay } } })

  const avgBasket = transactionsToday ? (salesTodayAgg._sum.total || 0) / transactionsToday : 0

  const lowStockCount = await prisma.product.count({ where: { stock: { lte: 5 } } })

  const summary = {
    salesToday: salesTodayAgg._sum.total || 0,
    transactionsToday,
    avgBasket,
    lowStockCount,
  }

  const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Dashboard Kasir</h1>
          <p className="text-sm text-gray-500">Ringkasan aktivitas dan performa toko — terakhir diperbarui {nowStr}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded shadow-sm text-sm hover:shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v6h6M20 20v-6h-6" /></svg>
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded shadow-sm text-sm hover:bg-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/></svg>
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3v18h18"/></svg>
          </div>
          <div>
            <div className="text-sm text-gray-500">Penjualan Hari Ini</div>
            <div className="text-xl font-semibold">{fmtCurrency(summary.salesToday)}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-100 text-sky-700 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7h18M3 12h18M3 17h18"/></svg>
          </div>
          <div>
            <div className="text-sm text-gray-500">Transaksi Hari Ini</div>
            <div className="text-xl font-semibold">{summary.transactionsToday}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow-sm flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-700 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v8M8 12h8"/></svg>
          </div>
          <div>
            <div className="text-sm text-gray-500">Rata-rata / Transaksi</div>
            <div className="text-xl font-semibold">{fmtCurrency(Math.round(summary.avgBasket))}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-700 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </div>
          <div>
            <div className="text-sm text-gray-500">Produk Stok Rendah</div>
            <div className="text-xl font-semibold">{summary.lowStockCount}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="text-lg font-medium mb-2">Penjualan 7 Hari</h3>
          <div className="h-64">
            <DashboardCharts />
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow-sm">
          <h3 className="text-lg font-medium mb-2">Produk Teratas</h3>
          <div className="h-64">
            {/* charts component also contains the bar chart for top products */}
            <DashboardCharts />
          </div>
        </div>
      </div>

      {/* Recent transactions table */}
      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="p-3 border-b">
          <div className="text-sm text-slate-600">Transaksi Terbaru</div>
        </div>
        <div className="p-2">
          <div className="overflow-x-auto">
            <RecentTransactionsTable />
          </div>
        </div>
      </div>
    </div>
  )
}

async function RecentTransactionsTable() {
  const rows = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 8,
  })

  const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })
  const dateFmt = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })

  return (
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
                <a href={`/api/print/transaction/${t.id}`} className="text-sm text-gray-600">Cetak</a>
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
  )
}
