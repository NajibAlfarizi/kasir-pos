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

  // Calculate profit today (price - cost) * quantity
  const transactionsToday_items = await prisma.transaction.findMany({
    where: { createdAt: { gte: startOfDay } },
    include: { items: { include: { product: true } } }
  })

  let profitToday = 0
  for (const tx of transactionsToday_items) {
    for (const item of tx.items) {
      if (item.product && item.product.cost) {
        const itemPrice = item.price || item.product.price
        const itemCost = item.product.cost
        const itemProfit = (itemPrice - itemCost) * item.quantity
        profitToday += itemProfit
      }
    }
  }

  const summary = {
    salesToday: salesTodayAgg._sum.total || 0,
    transactionsToday,
    avgBasket,
    profitToday,
  }

  const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-8">
      <div className="max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">📊 Dashboard Kasir</h1>
          <p className="text-sm text-slate-600">Ringkasan aktivitas dan performa toko — terakhir diperbarui {nowStr}</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl shadow-lg border-0 hover:shadow-xl transition-all flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3v18h18"/></svg>
          </div>
          <div>
            <div className="text-sm text-gray-500">Penjualan Hari Ini</div>
            <div className="text-xl font-semibold">{fmtCurrency(summary.salesToday)}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl shadow-lg border-0 hover:shadow-xl transition-all flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <div className="text-sm text-gray-500">Keuntungan Hari Ini</div>
            <div className="text-xl font-semibold text-green-600">{fmtCurrency(summary.profitToday)}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-50 to-blue-50 p-4 rounded-xl shadow-lg border-0 hover:shadow-xl transition-all flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-lg shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7h18M3 12h18M3 17h18"/></svg>
          </div>
          <div>
            <div className="text-sm text-slate-600">Transaksi Hari Ini</div>
            <div className="text-xl font-semibold">{summary.transactionsToday}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl shadow-lg border-0 hover:shadow-xl transition-all flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-lg shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v8M8 12h8"/></svg>
          </div>
          <div>
            <div className="text-sm text-slate-600">Rata-rata / Transaksi</div>
            <div className="text-xl font-semibold">{fmtCurrency(Math.round(summary.avgBasket))}</div>
          </div>
        </div>

      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border-0 h-full">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-sky-500 to-indigo-500 rounded-full"></span>
              📈 Penjualan 7 Hari Terakhir
            </h3>
            <div className="h-80">
              <DashboardCharts />
            </div>
          </div>
        </div>

        {/* Quick Stats - Takes 1 column */}
        <div className="lg:col-span-1">
          <QuickStatsCard salesToday={summary.salesToday} profitToday={summary.profitToday} />
        </div>
      </div>

      {/* Additional Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Comparison */}
        <PerformanceCard />

        {/* Peak Hours */}
        <PeakHoursCard />
      </div>

      {/* Recent transactions table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-0">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-1 h-6 bg-gradient-to-b from-sky-500 to-indigo-500 rounded-full"></span>
            🧾 Transaksi Terbaru
          </h3>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <RecentTransactionsTable />
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

async function PerformanceCard() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Today's data
  const todayData = await prisma.transaction.aggregate({
    _sum: { total: true },
    _count: true,
    where: { createdAt: { gte: today } }
  })

  // Yesterday's data
  const yesterdayData = await prisma.transaction.aggregate({
    _sum: { total: true },
    _count: true,
    where: { 
      createdAt: { 
        gte: yesterday,
        lt: today
      }
    }
  })

  const todaySales = todayData._sum.total || 0
  const yesterdaySales = yesterdayData._sum.total || 0
  const todayCount = todayData._count || 0
  const yesterdayCount = yesterdayData._count || 0

  const salesChange = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales * 100) : 0
  const countChange = yesterdayCount > 0 ? ((todayCount - yesterdayCount) / yesterdayCount * 100) : 0

  const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-6 rounded-xl shadow-lg border-0">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-gradient-to-b from-violet-500 to-purple-500 rounded-full"></span>
        📊 Performa vs Kemarin
      </h3>
      <div className="space-y-4">
        {/* Sales Comparison */}
        <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Penjualan</div>
          <div className="flex items-baseline justify-between">
            <div className="text-xl font-bold text-slate-900">{fmt.format(todaySales)}</div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              salesChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {salesChange >= 0 ? '↗' : '↘'} {Math.abs(salesChange).toFixed(1)}%
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-1">Kemarin: {fmt.format(yesterdaySales)}</div>
        </div>

        {/* Transaction Count Comparison */}
        <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Jumlah Transaksi</div>
          <div className="flex items-baseline justify-between">
            <div className="text-xl font-bold text-slate-900">{todayCount}</div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              countChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {countChange >= 0 ? '↗' : '↘'} {Math.abs(countChange).toFixed(1)}%
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-1">Kemarin: {yesterdayCount} transaksi</div>
        </div>

        {/* Average Basket */}
        <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Rata-rata per Transaksi</div>
          <div className="text-xl font-bold text-violet-600">
            {todayCount > 0 ? fmt.format(todaySales / todayCount) : 'Rp 0'}
          </div>
        </div>
      </div>
    </div>
  )
}

async function PeakHoursCard() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: today } },
    select: { createdAt: true, total: true }
  })

  // Group by hour
  const hourlyData: Record<number, { count: number; total: number }> = {}
  for (let i = 0; i < 24; i++) {
    hourlyData[i] = { count: 0, total: 0 }
  }

  transactions.forEach(tx => {
    const hour = new Date(tx.createdAt).getHours()
    hourlyData[hour].count += 1
    hourlyData[hour].total += tx.total
  })

  // Get top 5 busiest hours
  const peakHours = Object.entries(hourlyData)
    .map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
    .filter(h => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl shadow-lg border-0">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></span>
        ⏰ Jam Tersibuk Hari Ini
      </h3>
      {peakHours.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">Belum ada transaksi hari ini</div>
      ) : (
        <div className="space-y-3">
          {peakHours.map((item, idx) => {
            const maxCount = peakHours[0]?.count || 1
            const percentage = (item.count / maxCount) * 100
            
            return (
              <div key={item.hour} className="bg-white/60 backdrop-blur-sm p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {item.hour.toString().padStart(2, '0')}:00 - {(item.hour + 1).toString().padStart(2, '0')}:00
                      </div>
                      <div className="text-xs text-slate-500">{item.count} transaksi</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-amber-600 text-sm">{fmt.format(item.total)}</div>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function QuickStatsCard({ salesToday, profitToday }: { salesToday: number; profitToday: number }) {
  const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
  const profitMargin = salesToday > 0 ? (profitToday / salesToday * 100).toFixed(1) : '0.0'

  return (
    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl shadow-lg border-0">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full"></span>
        💡 Insight Hari Ini
      </h3>
      <div className="space-y-4">
        <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Margin Keuntungan</div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-teal-600">{profitMargin}%</div>
            <div className="text-xs text-slate-500">dari total penjualan</div>
          </div>
          <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all"
              style={{ width: `${Math.min(parseFloat(profitMargin), 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg">
          <div className="text-xs text-slate-500 mb-2">Breakdown Hari Ini</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">💰 Penjualan</span>
              <span className="font-semibold text-slate-900 text-sm">{fmt.format(salesToday)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">📈 Keuntungan</span>
              <span className="font-semibold text-green-600 text-sm">{fmt.format(profitToday)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-slate-600">💸 Modal Terpakai</span>
              <span className="font-semibold text-slate-900 text-sm">{fmt.format(salesToday - profitToday)}</span>
            </div>
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
