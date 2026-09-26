"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  TrendingUp,
  LineChart as LineChartIcon,
  BarChart3,
  Trophy,
  RefreshCw,
  Receipt,
  Calendar,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
} from 'lucide-react'
import {
  formatRupiah,
  formatCompactRupiah,
  formatDayAndDate,
  formatFullIndonesianDate,
  formatNumber,
} from '@/lib/format'

type SalesPoint = {
  date: string
  total: number
  count?: number
}

type TopProduct = {
  productId: number
  name: string
  category?: string
  sold: number
  revenue?: number
}

type PeriodDays = 7 | 14 | 30
type ViewMode = 'tren' | 'volume' | 'top_products'

type ChartInstanceType = {
  destroy: () => void
  update: () => void
}

export default function DashboardCharts() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstanceRef = useRef<ChartInstanceType | null>(null)

  const [period, setPeriod] = useState<PeriodDays>(7)
  const [viewMode, setViewMode] = useState<ViewMode>('tren')
  const [salesData, setSalesData] = useState<SalesPoint[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch sales and top products data
  const fetchData = useCallback(async (selectedDays: PeriodDays, showRefreshSpin = false) => {
    if (showRefreshSpin) setIsRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [salesRes, topRes] = await Promise.all([
        fetch(`/api/dashboard/sales-last7?days=${selectedDays}`),
        fetch(`/api/dashboard/top-products?limit=5`),
      ])

      if (!salesRes.ok || !topRes.ok) {
        throw new Error('Gagal memuat data grafik dari server')
      }

      const sales: SalesPoint[] = await salesRes.json()
      const tops: TopProduct[] = await topRes.json()

      setSalesData(Array.isArray(sales) ? sales : [])
      setTopProducts(Array.isArray(tops) ? tops : [])
    } catch (err: unknown) {
      console.error('Error fetching dashboard chart data:', err)
      const e = err as Error
      setError(e?.message || 'Gagal memuat data analitik')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Initial fetch and on period change
  useEffect(() => {
    fetchData(period)
  }, [fetchData, period])

  // Calculated Metrics
  const metrics = useMemo(() => {
    const totalSales = salesData.reduce((acc, curr) => acc + (curr.total || 0), 0)
    const totalTransactions = salesData.reduce((acc, curr) => acc + (curr.count || 0), 0)
    const averageDaily = salesData.length > 0 ? Math.round(totalSales / salesData.length) : 0

    let peakDay: SalesPoint | null = null
    for (const point of salesData) {
      if (!peakDay || point.total > peakDay.total) {
        peakDay = point
      }
    }

    const totalTopProductsSold = topProducts.reduce((acc, curr) => acc + (curr.sold || 0), 0)

    return {
      totalSales,
      totalTransactions,
      averageDaily,
      peakDay: peakDay && peakDay.total > 0 ? peakDay : null,
      totalTopProductsSold,
    }
  }, [salesData, topProducts])

  // Render or Update Chart.js Instance
  useEffect(() => {
    if (loading || !canvasRef.current || salesData.length === 0) return

    let isMounted = true

    async function buildChart() {
      try {
        const ChartModule = await import('chart.js/auto')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ChartCtor: any = ChartModule.default || ChartModule

        if (!isMounted || !canvasRef.current) return

        // Destroy previous instance cleanly
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy()
          chartInstanceRef.current = null
        }

        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return

        // 1. TREN PENJUALAN (Line / Smooth Area Chart)
        if (viewMode === 'tren') {
          const gradient = ctx.createLinearGradient(0, 0, 0, 300)
          gradient.addColorStop(0, 'rgba(79, 70, 229, 0.35)') // indigo-600 with opacity
          gradient.addColorStop(0.65, 'rgba(99, 102, 241, 0.08)')
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)')

          chartInstanceRef.current = new ChartCtor(ctx, {
            type: 'line',
            data: {
              labels: salesData.map((s) => formatDayAndDate(s.date)),
              datasets: [
                {
                  label: 'Omzet Penjualan',
                  data: salesData.map((s) => s.total),
                  borderColor: '#4f46e5', // indigo-600
                  borderWidth: 2.75,
                  backgroundColor: gradient,
                  fill: true,
                  tension: 0.38,
                  pointRadius: period === 30 ? 2 : 4,
                  pointHoverRadius: 7,
                  pointBackgroundColor: '#ffffff',
                  pointBorderColor: '#4f46e5',
                  pointBorderWidth: 2.5,
                  pointHoverBorderWidth: 3,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 500 },
              interaction: {
                mode: 'index',
                intersect: false,
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  titleColor: '#f8fafc',
                  bodyColor: '#e2e8f0',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  padding: 12,
                  boxPadding: 6,
                  usePointStyle: true,
                  callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    title: (items: any[]) => {
                      const idx = items[0]?.dataIndex
                      const item = salesData[idx]
                      return item ? formatFullIndonesianDate(item.date) : ''
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: (context: any) => {
                      const idx = context.dataIndex
                      const item = salesData[idx]
                      const lines = [`Omzet: ${formatRupiah(context.parsed.y)}`]
                      if (item?.count !== undefined) {
                        lines.push(`Total: ${item.count} transaksi`)
                      }
                      return lines
                    },
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: {
                    color: '#64748b',
                    font: { size: 11, family: 'inherit', weight: 500 },
                    maxRotation: period === 30 ? 45 : 0,
                    autoSkip: period === 30,
                    maxTicksLimit: period === 30 ? 12 : 14,
                  },
                },
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(226, 232, 240, 0.7)',
                    strokeDash: [4, 4],
                  },
                  ticks: {
                    color: '#64748b',
                    font: { size: 11, family: 'inherit' },
                    callback: (value: number | string) => formatCompactRupiah(Number(value)),
                  },
                },
              },
            },
          })
        }

        // 2. VOLUME TRANSAKSI (Bar Chart Harian)
        else if (viewMode === 'volume') {
          const barGradient = ctx.createLinearGradient(0, 0, 0, 300)
          barGradient.addColorStop(0, '#4f46e5')
          barGradient.addColorStop(1, '#818cf8')

          chartInstanceRef.current = new ChartCtor(ctx, {
            type: 'bar',
            data: {
              labels: salesData.map((s) => formatDayAndDate(s.date)),
              datasets: [
                {
                  label: 'Penjualan (Rp)',
                  data: salesData.map((s) => s.total),
                  backgroundColor: barGradient,
                  borderRadius: 6,
                  borderSkipped: false,
                  hoverBackgroundColor: '#4338ca',
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 500 },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  titleColor: '#f8fafc',
                  bodyColor: '#e2e8f0',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  padding: 12,
                  callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    title: (items: any[]) => {
                      const idx = items[0]?.dataIndex
                      const item = salesData[idx]
                      return item ? formatFullIndonesianDate(item.date) : ''
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: (context: any) => {
                      const idx = context.dataIndex
                      const item = salesData[idx]
                      return [
                        `Penjualan: ${formatRupiah(context.parsed.y)}`,
                        `Transaksi: ${item?.count || 0} struk`,
                      ]
                    },
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: {
                    color: '#64748b',
                    font: { size: 11, family: 'inherit', weight: 500 },
                    maxRotation: period === 30 ? 45 : 0,
                    autoSkip: period === 30,
                    maxTicksLimit: period === 30 ? 12 : 14,
                  },
                },
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(226, 232, 240, 0.7)',
                    strokeDash: [4, 4],
                  },
                  ticks: {
                    color: '#64748b',
                    font: { size: 11, family: 'inherit' },
                    callback: (value: number | string) => formatCompactRupiah(Number(value)),
                  },
                },
              },
            },
          })
        }

        // 3. PRODUK TERLARIS (Horizontal Bar Chart)
        else if (viewMode === 'top_products') {
          const horizontalGradient = ctx.createLinearGradient(0, 0, 400, 0)
          horizontalGradient.addColorStop(0, '#4f46e5')
          horizontalGradient.addColorStop(1, '#06b6d4') // indigo to cyan

          chartInstanceRef.current = new ChartCtor(ctx, {
            type: 'bar',
            data: {
              labels: topProducts.map((t) => t.name.length > 20 ? t.name.slice(0, 20) + '...' : t.name),
              datasets: [
                {
                  label: 'Terjual (pcs)',
                  data: topProducts.map((t) => t.sold),
                  backgroundColor: horizontalGradient,
                  borderRadius: 6,
                  borderSkipped: false,
                  hoverBackgroundColor: '#4338ca',
                },
              ],
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 500 },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  titleColor: '#f8fafc',
                  bodyColor: '#e2e8f0',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  padding: 12,
                  callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    title: (items: any[]) => {
                      const idx = items[0]?.dataIndex
                      return topProducts[idx]?.name || ''
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: (context: any) => {
                      const idx = context.dataIndex
                      const item = topProducts[idx]
                      const lines = [`Terjual: ${formatNumber(context.parsed.x)} pcs`]
                      if (item?.revenue) {
                        lines.push(`Total Nilai: ${formatRupiah(item.revenue)}`)
                      }
                      if (item?.category) {
                        lines.push(`Kategori: ${item.category}`)
                      }
                      return lines
                    },
                  },
                },
              },
              scales: {
                x: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(226, 232, 240, 0.7)',
                    strokeDash: [4, 4],
                  },
                  ticks: {
                    color: '#64748b',
                    font: { size: 11, family: 'inherit' },
                    callback: (value: number | string) => `${value} pcs`,
                  },
                },
                y: {
                  grid: { display: false },
                  ticks: {
                    color: '#334155',
                    font: { size: 11, family: 'inherit', weight: 600 },
                  },
                },
              },
            },
          })
        }
      } catch (err) {
        console.error('Failed to initialize Chart.js:', err)
      }
    }

    buildChart()

    return () => {
      isMounted = false
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [loading, salesData, topProducts, viewMode, period])

  return (
    <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 p-5 lg:p-6 flex flex-col justify-between h-full">
      {/* 1. Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xs">
            {viewMode === 'top_products' ? (
              <Trophy className="w-5 h-5" />
            ) : viewMode === 'volume' ? (
              <BarChart3 className="w-5 h-5" />
            ) : (
              <TrendingUp className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {viewMode === 'top_products'
                  ? 'Produk Terlaris Minimarket'
                  : viewMode === 'volume'
                  ? 'Perbandingan Penjualan Harian'
                  : 'Tren Penjualan & Omzet'}
              </h2>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Live Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {viewMode === 'top_products'
                ? '5 produk dengan kuantitas penjualan tertinggi'
                : `Analisis pergerakan transaksi ${period} hari terakhir`}
            </p>
          </div>
        </div>

        {/* Action Controls: Tabs & Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('tren')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'tren'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Kurva Tren Omzet"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Tren</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('volume')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'volume'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Batang Harian"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Batang</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('top_products')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'top_products'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Top 5 Produk Terlaris"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Top 5</span>
            </button>
          </div>

          {/* Period Selection (Visible for Tren & Volume) */}
          {viewMode !== 'top_products' && (
            <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80">
              {([7, 14, 30] as PeriodDays[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPeriod(d)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    period === d
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d}H
                </button>
              ))}
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchData(period, true)}
            disabled={isRefreshing || loading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs disabled:opacity-50"
            title="Muat ulang data grafik"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        {/* Total Omzet Periode */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Total Omzet</span>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
              {period} Hari
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tracking-tight">
            {formatRupiah(metrics.totalSales)}
          </div>
        </div>

        {/* Total Transaksi */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Total Struk</span>
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tracking-tight">
            {metrics.totalTransactions} <span className="text-xs font-normal text-slate-500">struk</span>
          </div>
        </div>

        {/* Rata-rata Penjualan Harian */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Rata-rata / Hari</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-indigo-700 mt-0.5 tracking-tight">
            {formatCompactRupiah(metrics.averageDaily)}
          </div>
        </div>

        {/* Puncak Penjualan (Peak) */}
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
          <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Puncak Tertinggi</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5 tracking-tight truncate">
            {metrics.peakDay ? formatCompactRupiah(metrics.peakDay.total) : 'Rp 0'}
          </div>
          {metrics.peakDay && (
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {formatDayAndDate(metrics.peakDay.date)}
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Chart Canvas Area */}
      <div className="relative w-full h-72 sm:h-80 flex-1 min-h-[260px] mt-1">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs rounded-xl z-10">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-500 font-medium">Memuat data analitik transaksi...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm font-semibold text-rose-600 mb-2">{error}</p>
            <button
              onClick={() => fetchData(period)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <canvas ref={canvasRef} className="w-full h-full" />
        )}
      </div>

      {/* 4. Bottom Rich Card: Quick Top Products Highlight when in Trend View */}
      {viewMode !== 'top_products' && topProducts.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
              <Trophy className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-slate-700">Produk Terlaris Saat Ini:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {topProducts.slice(0, 3).map((item, idx) => (
              <span
                key={item.productId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 rounded-lg text-xs text-slate-700 transition-colors"
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                    idx === 0
                      ? 'bg-amber-500'
                      : idx === 1
                      ? 'bg-slate-400'
                      : 'bg-amber-700'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="font-medium max-w-[130px] truncate">{item.name}</span>
                <span className="font-bold text-indigo-700 text-[11px]">{item.sold} pcs</span>
              </span>
            ))}

            <button
              type="button"
              onClick={() => setViewMode('top_products')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 ml-1"
            >
              Lihat Semua →
            </button>
          </div>
        </div>
      )}

      {/* If in Top Products View: Detailed Ranking List underneath chart */}
      {viewMode === 'top_products' && (
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {topProducts.map((p, idx) => {
              const maxSold = topProducts[0]?.sold || 1
              const percentage = Math.round((p.sold / maxSold) * 100)

              return (
                <div
                  key={p.productId}
                  className="bg-slate-50/90 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-200/70 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500 text-white shadow-xs'
                            : idx === 1
                            ? 'bg-slate-400 text-white'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate" title={p.name}>
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-500">{p.category || 'Umum'}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-indigo-700 text-xs">{p.sold} pcs</div>
                      {p.revenue ? (
                        <div className="text-[10px] text-slate-500 font-medium">
                          {formatCompactRupiah(p.revenue)}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Visual Bar Percentage */}
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                          : 'bg-gradient-to-r from-indigo-500 to-cyan-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
