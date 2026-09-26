import React from 'react'
import DashboardCharts from '@/components/DashboardCharts'
import RecentTransactionsTable from '@/components/RecentTransactionsTable'
import prisma from '@/lib/prisma'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import Link from 'next/link'
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Receipt,
  ShoppingBag,
  Banknote,
  QrCode,
  LineChart,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  RotateCw,
  Download,
} from 'lucide-react'
import { formatRupiah, formatDateTime } from '@/lib/format'

export default async function DashboardPage() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const salesTodayAgg = await prisma.transaction.aggregate({
    _sum: { total: true },
    where: { createdAt: { gte: startOfDay } },
  })

  const transactionsToday = await prisma.transaction.count({ where: { createdAt: { gte: startOfDay } } })

  // Cash vs QRIS aggregates today
  const cashSalesAgg = await prisma.transaction.aggregate({
    _sum: { total: true },
    where: { createdAt: { gte: startOfDay }, paymentMethod: 'CASH' } as any,
  })
  const cashTransactionsToday = await prisma.transaction.count({
    where: { createdAt: { gte: startOfDay }, paymentMethod: 'CASH' } as any,
  })

  const qrisSalesAgg = await prisma.transaction.aggregate({
    _sum: { total: true },
    where: { createdAt: { gte: startOfDay }, paymentMethod: 'QRIS' } as any,
  })
  const qrisTransactionsToday = await prisma.transaction.count({
    where: { createdAt: { gte: startOfDay }, paymentMethod: 'QRIS' } as any,
  })

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
    cashSalesToday: cashSalesAgg._sum.total || 0,
    cashTransactionsToday,
    qrisSalesToday: qrisSalesAgg._sum.total || 0,
    qrisTransactionsToday,
    avgBasket,
    profitToday,
  }

  const nowStr = formatDateTime(new Date())

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                Dashboard Kasir
              </h1>
            </div>
            <p suppressHydrationWarning className="text-sm text-slate-500 mt-1">
              Ringkasan performa penjualan dan transaksi toko hari ini — diperbarui {nowStr}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
            >
              <RotateCw className="h-3.5 w-3.5 text-slate-500" />
              Refresh
            </Link>
            <Link
              href="/laporan"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Lihat Laporan
            </Link>
          </div>
        </div>

        {/* Main 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Penjualan Hari Ini */}
          <div className="bg-gradient-to-br from-indigo-50/90 to-blue-50/70 p-5 rounded-xl border border-indigo-100/80 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-xl shadow-xs shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Penjualan Hari Ini</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5 truncate">{formatRupiah(summary.salesToday)}</div>
              <div className="text-xs text-slate-400 mt-0.5">Total omset kotor toko</div>
            </div>
          </div>

          {/* 2. Keuntungan Hari Ini */}
          <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/70 p-5 rounded-xl border border-emerald-100/80 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-xl shadow-xs shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Keuntungan Hari Ini</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-0.5 truncate">{formatRupiah(summary.profitToday)}</div>
              <div className="text-xs text-slate-400 mt-0.5">Laba kotor setelah modal HPP</div>
            </div>
          </div>

          {/* 3. Total Semua Transaksi */}
          <div className="bg-gradient-to-br from-sky-50/90 to-blue-50/70 p-5 rounded-xl border border-sky-100/80 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-xl shadow-xs shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Transaksi</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{summary.transactionsToday} <span className="text-sm font-semibold text-slate-500">transaksi</span></div>
              <div className="text-xs text-slate-400 mt-0.5">Semua metode pembayaran</div>
            </div>
          </div>

          {/* 4. Rata-rata / Transaksi */}
          <div className="bg-gradient-to-br from-purple-50/90 to-pink-50/70 p-5 rounded-xl border border-purple-100/80 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-xs shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rata-rata / Transaksi</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5 truncate">{formatRupiah(Math.round(summary.avgBasket))}</div>
              <div className="text-xs text-slate-400 mt-0.5">Nilai rata-rata keranjang</div>
            </div>
          </div>

        </div>

        {/* Payment Method Breakdown: Tunai (Cash) & QRIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-2xs border border-sky-200/80 hover:shadow-xs transition-all flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-sky-50 text-sky-600 border border-sky-200/80 rounded-xl shadow-2xs flex items-center justify-center shrink-0">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-sky-800">Transaksi Tunai (Cash)</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{formatRupiah(summary.cashSalesToday)}</div>
                <div className="text-xs text-slate-500 mt-0.5">Uang fisik kasir yang harus ada di laci hari ini</div>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 text-sky-800 rounded-full font-bold text-xs border border-sky-200 shadow-2xs">
                <Banknote className="w-3.5 h-3.5" />
                {summary.cashTransactionsToday} transaksi
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-2xs border border-emerald-200/80 hover:shadow-xs transition-all flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-200/80 rounded-xl shadow-2xs flex items-center justify-center shrink-0">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">Transaksi Non-Tunai (QRIS)</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{formatRupiah(summary.qrisSalesToday)}</div>
                <div className="text-xs text-slate-500 mt-0.5">Dana masuk otomatis ke rekening/e-wallet hari ini</div>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs border border-emerald-200 shadow-2xs">
                <QrCode className="w-3.5 h-3.5" />
                {summary.qrisTransactionsToday} transaksi
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <DashboardCharts />
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
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-sky-500 to-indigo-600 rounded-full"></span>
              <Receipt className="w-4 h-4 text-slate-700" />
              Transaksi Terbaru Hari Ini
            </h3>
            <Link href="/transaksi" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              Lihat Semua Transaksi →
            </Link>
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

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xs border border-violet-100">
      <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-5 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></span>
        <TrendingUp className="w-4 h-4 text-violet-600" />
        Performa vs Kemarin
      </h3>
      <div className="space-y-4">
        {/* Sales Comparison */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
          <div className="text-xs text-slate-500 mb-1">Penjualan</div>
          <div className="flex items-baseline justify-between">
            <div className="text-xl font-bold text-slate-900">{formatRupiah(todaySales)}</div>
            <div className={`flex items-center gap-0.5 text-xs font-bold ${
              salesChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {salesChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(salesChange).toFixed(1)}%
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-1">Kemarin: {formatRupiah(yesterdaySales)}</div>
        </div>

        {/* Transaction Count Comparison */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
          <div className="text-xs text-slate-500 mb-1">Jumlah Transaksi</div>
          <div className="flex items-baseline justify-between">
            <div className="text-xl font-bold text-slate-900">{todayCount}</div>
            <div className={`flex items-center gap-0.5 text-xs font-bold ${
              countChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {countChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(countChange).toFixed(1)}%
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-1">Kemarin: {yesterdayCount} transaksi</div>
        </div>

        {/* Average Basket */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
          <div className="text-xs text-slate-500 mb-1">Rata-rata per Transaksi</div>
          <div className="text-xl font-bold text-violet-700">
            {todayCount > 0 ? formatRupiah(todaySales / todayCount) : 'Rp 0'}
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

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xs border border-amber-100">
      <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-5 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></span>
        <Clock className="w-4 h-4 text-amber-600" />
        Jam Tersibuk Hari Ini
      </h3>
      {peakHours.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">Belum ada transaksi hari ini</div>
      ) : (
        <div className="space-y-3">
          {peakHours.map((item, idx) => {
            const maxCount = peakHours[0]?.count || 1
            const percentage = (item.count / maxCount) * 100
            
            return (
              <div key={item.hour} className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">
                        {item.hour.toString().padStart(2, '0')}:00 - {(item.hour + 1).toString().padStart(2, '0')}:00
                      </div>
                      <div className="text-xs text-slate-500">{item.count} transaksi</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-700 text-sm">{formatRupiah(item.total)}</div>
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
  const profitMargin = salesToday > 0 ? (profitToday / salesToday * 100).toFixed(1) : '0.0'

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xs border border-teal-100 h-full">
      <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-5 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full"></span>
        <Zap className="w-4 h-4 text-teal-600" />
        Insight Keuangan Hari Ini
      </h3>
      <div className="space-y-4">
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
          <div className="text-xs text-slate-500 mb-1">Margin Keuntungan</div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-extrabold text-teal-700">{profitMargin}%</div>
            <div className="text-xs text-slate-400">dari total omzet</div>
          </div>
          <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all"
              style={{ width: `${Math.min(parseFloat(profitMargin), 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Rincian Hari Ini</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                Penjualan (Omzet)
              </span>
              <span className="font-bold text-slate-900">{formatRupiah(salesToday)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                Laba Bersih
              </span>
              <span className="font-bold text-emerald-600">{formatRupiah(profitToday)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200/80">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-slate-400" />
                Modal Produk (HPP)
              </span>
              <span className="font-bold text-slate-800">{formatRupiah(salesToday - profitToday)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
