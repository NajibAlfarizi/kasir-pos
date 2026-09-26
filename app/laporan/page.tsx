"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import {
  BarChart3,
  Calendar,
  CalendarDays,
  CalendarRange,
  TrendingUp,
  SlidersHorizontal,
  RotateCw,
  Download,
  Printer,
  Wallet,
  Boxes,
  Percent,
  Banknote,
  QrCode,
  Receipt,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react'
import { formatDateTime } from '@/lib/format'

// Simple Card component
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}>{children}</div>
)

// Add print styles
if (typeof window !== 'undefined') {
  const existingStyle = document.getElementById('print-styles')
  if (!existingStyle) {
    const style = document.createElement('style')
    style.id = 'print-styles'
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #printable-report, #printable-report * { visibility: visible; }
        #printable-report { 
          position: absolute; 
          left: 0; 
          top: 0; 
          width: 100%; 
          padding: 20px;
        }
        .no-print { display: none !important; }
        .print-break { page-break-after: always; }
        .bg-gradient-to-br, .bg-gradient-to-r, .backdrop-blur-sm { 
          background: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          box-shadow: none !important;
        }
        .hidden { display: none !important; }
        .print\\:block { display: block !important; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
      }
    `
    document.head.appendChild(style)
  }
}

type TopProduct = {
  id?: number
  name: string
  quantity: number
  revenue: number
  cost: number
  profit: number
  margin: number
}

type DailySale = {
  date: string
  sales: number
  cost: number
  profit: number
  transactions: number
}

type MonthlySale = {
  month: string
  sales: number
  cost: number
  profit: number
  transactions: number
}

type ReportData = {
  startDate: string
  endDate: string
  totalSales: number
  totalCost: number
  totalProfit: number
  profitMargin: number
  totalTransactions: number
  totalItemsSold: number
  totalCash: number
  totalQris: number
  countCash: number
  countQris: number
  avgBasket: number
  avgItems: number
  topProducts: TopProduct[]
  dailySales: DailySale[]
  monthlySales: MonthlySale[]
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

// Helper: Format local date to YYYY-MM-DD
function formatLocalDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const y = Number(parts[0])
  const m = Number(parts[1]) - 1
  const d = Number(parts[2])
  return `${d} ${MONTH_NAMES[m] || ''} ${y}`
}

function formatIndonesianDateWithDay(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const y = Number(parts[0])
  const m = Number(parts[1]) - 1
  const d = Number(parts[2])
  const dateObj = new Date(y, m, d)
  const dayName = DAY_NAMES[dateObj.getDay()]
  return `${dayName}, ${d} ${MONTH_NAMES[m] || ''} ${y}`
}

function formatIndonesianMonth(monthStr: string): string {
  if (!monthStr) return ''
  const parts = monthStr.split('-')
  if (parts.length !== 2) return monthStr
  const y = Number(parts[0])
  const m = Number(parts[1]) - 1
  return `${MONTH_NAMES[m] || ''} ${y}`
}

export default function LaporanPage() {
  const [periodType, setPeriodType] = React.useState<PeriodType>('daily')
  const [startDate, setStartDate] = React.useState<string>(() => formatLocalDate(new Date()))
  const [endDate, setEndDate] = React.useState<string>(() => formatLocalDate(new Date()))
  
  // Specific picker controls
  const [selectedSingleDate, setSelectedSingleDate] = React.useState<string>(() => formatLocalDate(new Date()))
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedYear, setSelectedYear] = React.useState<number>(() => new Date().getFullYear())

  const [loading, setLoading] = React.useState<boolean>(false)
  const [reportData, setReportData] = React.useState<ReportData | null>(null)

  // Deterministic currency formatter to avoid SSR/client hydration mismatches
  const fmt = React.useMemo(() => ({
    format: (amount: number) => {
      const num = Math.round(Number(amount) || 0)
      return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
  }), [])

  // Core fetch function
  const fetchReport = React.useCallback(async (start: string, end: string, showSuccessToast = false) => {
    if (!start || !end) return
    if (start > end) {
      toast.error('Tanggal mulai tidak boleh melebihi tanggal akhir')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/laporan?startDate=${start}&endDate=${end}`, {
        cache: 'no-store'
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json?.error || 'Gagal memuat laporan')
        return
      }

      const data: ReportData = await res.json()
      setReportData(data)
      if (showSuccessToast) {
        toast.success('Laporan berhasil diperbarui')
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data laporan')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch immediately whenever startDate or endDate changes
  React.useEffect(() => {
    if (startDate && endDate) {
      fetchReport(startDate, endDate)
    }
  }, [startDate, endDate, fetchReport])

  // Presets Handlers
  const handleSelectDailyPreset = (preset: 'today' | 'yesterday') => {
    setPeriodType('daily')
    const d = new Date()
    if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1)
    }
    const dateStr = formatLocalDate(d)
    setSelectedSingleDate(dateStr)
    setStartDate(dateStr)
    setEndDate(dateStr)
  }

  const handleSingleDateChange = (val: string) => {
    if (!val) return
    setSelectedSingleDate(val)
    setPeriodType('daily')
    setStartDate(val)
    setEndDate(val)
  }

  const handleSelectWeeklyPreset = (preset: 'this_week' | 'past_7_days') => {
    setPeriodType('weekly')
    const now = new Date()
    if (preset === 'this_week') {
      // Monday to Sunday of current week
      const dayOfWeek = now.getDay()
      const diffToMonday = (dayOfWeek + 6) % 7
      const monday = new Date(now)
      monday.setDate(now.getDate() - diffToMonday)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      setStartDate(formatLocalDate(monday))
      setEndDate(formatLocalDate(sunday))
    } else {
      // Past 7 days up to today
      const past7 = new Date(now)
      past7.setDate(now.getDate() - 6)
      setStartDate(formatLocalDate(past7))
      setEndDate(formatLocalDate(now))
    }
  }

  const handleSelectMonthlyPreset = (preset: 'this_month' | 'last_month') => {
    setPeriodType('monthly')
    const now = new Date()
    let y = now.getFullYear()
    let m = now.getMonth()

    if (preset === 'last_month') {
      m -= 1
      if (m < 0) {
        m = 11
        y -= 1
      }
    }

    const firstDay = new Date(y, m, 1)
    const lastDay = new Date(y, m + 1, 0)
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`

    setSelectedMonth(monthKey)
    setStartDate(formatLocalDate(firstDay))
    setEndDate(formatLocalDate(lastDay))
  }

  const handleMonthChange = (monthStr: string) => {
    if (!monthStr) return
    setSelectedMonth(monthStr)
    setPeriodType('monthly')
    const [yStr, mStr] = monthStr.split('-')
    const y = Number(yStr)
    const m = Number(mStr) - 1
    const firstDay = new Date(y, m, 1)
    const lastDay = new Date(y, m + 1, 0)
    setStartDate(formatLocalDate(firstDay))
    setEndDate(formatLocalDate(lastDay))
  }

  const handleSelectYearlyPreset = (targetYear: number) => {
    setPeriodType('yearly')
    setSelectedYear(targetYear)
    setStartDate(`${targetYear}-01-01`)
    setEndDate(`${targetYear}-12-31`)
  }

  const handleManualFilterSubmit = () => {
    fetchReport(startDate, endDate, true)
  }

  const exportToCsv = () => {
    if (!reportData) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }

    const periodLabel = periodType === 'daily' ? 'Harian' 
      : periodType === 'weekly' ? 'Mingguan'
      : periodType === 'monthly' ? 'Bulanan'
      : periodType === 'yearly' ? 'Tahunan'
      : 'Kustom'

    let csv = `LAPORAN PENJUALAN & KEUNTUNGAN (${periodLabel.toUpperCase()})\n`
    csv += `Periode Mulai,${startDate}\n`
    csv += `Periode Akhir,${endDate}\n`
    csv += `Waktu Ekspor,${new Date().toLocaleString('id-ID')}\n\n`
    
    csv += `RINGKASAN KEUANGAN\n`
    csv += `Total Penjualan (Omzet),${reportData.totalSales}\n`
    csv += `Total Modal (HPP),${reportData.totalCost}\n`
    csv += `Total Keuntungan Bersih (Laba),${reportData.totalProfit}\n`
    csv += `Margin Keuntungan,${reportData.profitMargin}%\n`
    csv += `Total Transaksi,${reportData.totalTransactions}\n`
    csv += `Total Barang Terjual,${reportData.totalItemsSold}\n`
    csv += `Rata-rata Nilai per Transaksi,${reportData.avgBasket}\n`
    csv += `Rata-rata Item per Transaksi,${reportData.avgItems}\n`
    csv += `Penerimaan Tunai (Cash),${reportData.totalCash} (${reportData.countCash} transaksi)\n`
    csv += `Penerimaan Non-Tunai (QRIS),${reportData.totalQris} (${reportData.countQris} transaksi)\n\n`
    
    csv += `PRODUK TERLARIS\n`
    csv += `No,Nama Produk,Jumlah Terjual,Total Pendapatan,Total Modal,Keuntungan Bersih,Margin\n`
    reportData.topProducts.forEach((p, idx) => {
      csv += `${idx + 1},"${p.name.replace(/"/g, '""')}",${p.quantity},${p.revenue},${p.cost},${p.profit},${p.margin}%\n`
    })
    
    if (reportData.dailySales && reportData.dailySales.length > 0) {
      csv += `\nRINCIAN PENJUALAN HARIAN\n`
      csv += `Tanggal,Penjualan,Modal,Keuntungan,Jumlah Transaksi\n`
      reportData.dailySales.forEach(d => {
        csv += `${d.date},${d.sales},${d.cost},${d.profit},${d.transactions}\n`
      })
    }

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `laporan-${periodLabel.toLowerCase()}-${startDate}-${endDate}.csv`
    link.click()
    
    toast.success('Laporan CSV berhasil diunduh')
  }

  // Calculate day count
  const dayCount = React.useMemo(() => {
    if (!startDate || !endDate) return 1
    const s = new Date(startDate).getTime()
    const e = new Date(endDate).getTime()
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 1
  }, [startDate, endDate])

  const currentYearNow = new Date().getFullYear()
  const availableYears = [currentYearNow, currentYearNow - 1, currentYearNow - 2]

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <header className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 border border-purple-100 rounded-lg text-purple-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                Laporan Penjualan & Keuntungan
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Data penjualan, omzet, modal (HPP), dan laba bersih terhitung secara otomatis & real-time
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchReport(startDate, endDate, true)}
              disabled={loading}
              className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium shadow-2xs transition-all"
            >
              <RotateCw className={`h-3.5 w-3.5 mr-1.5 text-purple-600 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Memuat...' : 'Refresh'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportToCsv}
              disabled={!reportData || loading}
              className="bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-700 font-semibold shadow-2xs transition-all"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              Export CSV
            </Button>

            <Button
              size="sm"
              onClick={() => window.print()}
              disabled={!reportData || loading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print
            </Button>
          </div>
        </header>

        {/* Filter Section */}
        <Card className="p-5 md:p-6 bg-white shadow-2xs border border-slate-200/80 no-print">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pilih Periode Laporan
              </label>
              <span className="text-xs text-purple-700 font-medium bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                ⚡ Laporan otomatis diperbarui seketika
              </span>
            </div>

            {/* Main Period Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { value: 'daily', label: 'Harian', sub: 'Per Hari', icon: Calendar },
                { value: 'weekly', label: 'Mingguan', sub: 'Per Minggu', icon: CalendarDays },
                { value: 'monthly', label: 'Bulanan', sub: 'Per Bulan', icon: CalendarRange },
                { value: 'yearly', label: 'Tahunan', sub: 'Per Tahun', icon: TrendingUp },
                { value: 'custom', label: 'Kustom', sub: 'Rentang Bebas', icon: SlidersHorizontal }
              ].map((item) => {
                const isActive = periodType === item.value
                const ItemIcon = item.icon
                return (
                  <button
                    key={item.value}
                    onClick={() => {
                      if (item.value === 'daily') {
                        handleSelectDailyPreset('today')
                      } else if (item.value === 'weekly') {
                        handleSelectWeeklyPreset('this_week')
                      } else if (item.value === 'monthly') {
                        handleSelectMonthlyPreset('this_month')
                      } else if (item.value === 'yearly') {
                        handleSelectYearlyPreset(currentYearNow)
                      } else {
                        setPeriodType('custom')
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                      isActive
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-2xs ring-1 ring-purple-600/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-sm">
                      <ItemIcon className="w-4 h-4 text-purple-600" />
                      <span>{item.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{item.sub}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contextual Sub-Filters */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            
            {/* HARIAN Filter Controls */}
            {periodType === 'daily' && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Pilih Hari:</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={startDate === formatLocalDate(new Date()) ? "default" : "outline"}
                    className={startDate === formatLocalDate(new Date()) ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-slate-200"}
                    onClick={() => handleSelectDailyPreset('today')}
                  >
                    Hari Ini
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50"
                    onClick={() => handleSelectDailyPreset('yesterday')}
                  >
                    Kemarin
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">atau pilih tanggal:</span>
                  <Input
                    type="date"
                    value={selectedSingleDate}
                    onChange={(e) => handleSingleDateChange(e.target.value)}
                    className="w-auto h-9 text-sm border-slate-300"
                  />
                </div>
              </div>
            )}

            {/* MINGGUAN Filter Controls */}
            {periodType === 'weekly' && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Pilih Minggu:</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 hover:bg-purple-50 hover:text-purple-700"
                    onClick={() => handleSelectWeeklyPreset('this_week')}
                  >
                    Minggu Ini (Senin - Minggu)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 hover:bg-purple-50 hover:text-purple-700"
                    onClick={() => handleSelectWeeklyPreset('past_7_days')}
                  >
                    7 Hari Terakhir
                  </Button>
                </div>
              </div>
            )}

            {/* BULANAN Filter Controls */}
            {periodType === 'monthly' && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Pilih Bulan:</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 hover:bg-purple-50 hover:text-purple-700"
                    onClick={() => handleSelectMonthlyPreset('this_month')}
                  >
                    Bulan Ini
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 hover:bg-purple-50 hover:text-purple-700"
                    onClick={() => handleSelectMonthlyPreset('last_month')}
                  >
                    Bulan Lalu
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">atau pilih bulan:</span>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-auto h-9 text-sm border-slate-300"
                  />
                </div>
              </div>
            )}

            {/* TAHUNAN Filter Controls */}
            {periodType === 'yearly' && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Pilih Tahun:</span>
                <div className="flex gap-2">
                  {availableYears.map((yr) => (
                    <Button
                      key={yr}
                      size="sm"
                      variant={selectedYear === yr ? "default" : "outline"}
                      className={selectedYear === yr ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-slate-200"}
                      onClick={() => handleSelectYearlyPreset(yr)}
                    >
                      Tahun {yr}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* KUSTOM Filter Controls */}
            {periodType === 'custom' && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Dari:</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-auto h-9 text-sm border-slate-300"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Sampai:</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-auto h-9 text-sm border-slate-300"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleManualFilterSubmit}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 px-4"
                >
                  Terapkan
                </Button>
              </div>
            )}

            {/* Active Period Badge */}
            <div className="flex items-center gap-2 ml-auto text-xs bg-slate-100 text-slate-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200/80">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span>
                {startDate === endDate ? (
                  formatIndonesianDateWithDay(startDate)
                ) : (
                  `${formatIndonesianDate(startDate)} s/d ${formatIndonesianDate(endDate)} (${dayCount} hari)`
                )}
              </span>
            </div>
          </div>
        </Card>

        {/* Loading Spinner Indicator */}
        {loading && !reportData && (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Spinner className="w-8 h-8 text-purple-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Memuat data laporan...</p>
          </div>
        )}

        {/* Report Content */}
        {reportData && (
          <div id="printable-report" className="space-y-6">
            
            {/* Print Header */}
            <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-300">
              <h1 className="text-2xl font-bold text-slate-900">Laporan Penjualan Minimarket</h1>
              <p className="text-xs text-slate-600 mt-1">
                Periode: {formatIndonesianDate(startDate)} - {formatIndonesianDate(endDate)} ({dayCount} hari)
              </p>
              <p suppressHydrationWarning className="text-xs text-slate-500">
                Waktu Cetak: {formatDateTime(new Date())}
              </p>
            </div>

            {/* Financial Summary Cards (Omzet, Modal, Keuntungan, Margin) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Total Penjualan (Omzet) */}
              <Card className="p-5 bg-gradient-to-br from-indigo-50/90 to-blue-50/70 border-indigo-100/80 shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-xl shadow-xs">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Penjualan (Omzet)</div>
                    <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{fmt.format(reportData.totalSales)}</div>
                  </div>
                </div>
              </Card>

              {/* Total Modal (HPP) */}
              <Card className="p-5 bg-gradient-to-br from-amber-50/90 to-orange-50/70 border-amber-100/80 shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-xs">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Modal (HPP)</div>
                    <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{fmt.format(reportData.totalCost)}</div>
                  </div>
                </div>
              </Card>

              {/* Keuntungan Bersih (Laba) */}
              <Card className="p-5 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border-emerald-100/80 shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-xl shadow-xs">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Laba Bersih (Keuntungan)</div>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">{fmt.format(reportData.totalProfit)}</div>
                  </div>
                </div>
              </Card>

              {/* Margin Keuntungan */}
              <Card className="p-5 bg-gradient-to-br from-purple-50/90 to-pink-50/70 border-purple-100/80 shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-xs">
                    <Percent className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Margin Keuntungan</div>
                    <div className="text-2xl font-extrabold text-purple-700 mt-0.5">{reportData.profitMargin}%</div>
                  </div>
                </div>
              </Card>

            </div>

            {/* Breakdown Penerimaan Tunai & QRIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 bg-gradient-to-br from-sky-50 to-blue-50/60 border border-sky-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-sky-500 text-white rounded-xl shadow-xs flex items-center justify-center">
                      <Banknote className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-sky-800">Penerimaan Tunai (Cash)</div>
                      <div className="text-2xl font-bold text-slate-900 mt-0.5">{fmt.format(reportData.totalCash)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-3 py-1 bg-sky-100 text-sky-800 rounded-full border border-sky-200 shadow-2xs">
                      {reportData.countCash} transaksi
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {reportData.totalSales > 0 ? ((reportData.totalCash / reportData.totalSales) * 100).toFixed(1) : 0}% dari omzet
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl shadow-xs flex items-center justify-center">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Penerimaan Non-Tunai (QRIS)</div>
                      <div className="text-2xl font-bold text-slate-900 mt-0.5">{fmt.format(reportData.totalQris)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 shadow-2xs">
                      {reportData.countQris} transaksi
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {reportData.totalSales > 0 ? ((reportData.totalQris / reportData.totalSales) * 100).toFixed(1) : 0}% dari omzet
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Additional Volume & Basket Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Total Transaksi</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">{reportData.totalTransactions} transaksi</div>
                </div>
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Receipt className="w-5 h-5" />
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Total Barang Terjual</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">{reportData.totalItemsSold} pcs</div>
                </div>
                <div className="p-2.5 bg-pink-50 text-pink-600 rounded-lg">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Rata-rata Nilai / Transaksi</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">{fmt.format(reportData.avgBasket)}</div>
                </div>
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </Card>
            </div>

            {/* Monthly / Daily Breakdown Chart */}
            <Card className="p-6 bg-white border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-gradient-to-b from-purple-600 to-indigo-600 rounded-full"></span>
                  {periodType === 'yearly' ? 'Grafik Penjualan Bulanan' : 'Grafik Penjualan Harian'}
                </h2>
                <span className="text-xs text-slate-500">
                  {periodType === 'yearly' 
                    ? `${reportData.monthlySales.length} bulan tercatat` 
                    : `${reportData.dailySales.length} hari ada transaksi`}
                </span>
              </div>

              {/* Yearly: Monthly Sales Bars */}
              {periodType === 'yearly' ? (
                reportData.monthlySales.length > 0 ? (
                  <div className="space-y-3.5">
                    {reportData.monthlySales.map((m, idx) => {
                      const maxSales = Math.max(...reportData.monthlySales.map(item => item.sales), 1)
                      const percentage = Math.max((m.sales / maxSales) * 100, 2)
                      const marginPercent = m.sales > 0 ? ((m.profit / m.sales) * 100).toFixed(0) : '0'

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-700">
                              {formatIndonesianMonth(m.month)}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500">{m.transactions} transaksi</span>
                              <span className="text-xs text-emerald-600 font-medium">Laba: {fmt.format(m.profit)}</span>
                              <span className="font-bold text-indigo-700">{fmt.format(m.sales)}</span>
                            </div>
                          </div>
                          <div className="relative h-7 bg-slate-100 rounded-lg overflow-hidden">
                            <div 
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg transition-all duration-500 flex items-center justify-end pr-2.5"
                              style={{ width: `${percentage}%` }}
                            >
                              {percentage > 20 && (
                                <span className="text-white text-[11px] font-semibold">
                                  {marginPercent}% margin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-10">
                    Tidak ada data penjualan pada tahun ini
                  </div>
                )
              ) : (
                /* Daily Sales Bars */
                reportData.dailySales.length > 0 ? (
                  <div className="space-y-3.5">
                    {reportData.dailySales.map((d, idx) => {
                      const maxSales = Math.max(...reportData.dailySales.map(item => item.sales), 1)
                      const percentage = Math.max((d.sales / maxSales) * 100, 2)
                      const marginPercent = d.sales > 0 ? ((d.profit / d.sales) * 100).toFixed(0) : '0'

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">
                              {formatIndonesianDateWithDay(d.date)}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-500">{d.transactions} transaksi</span>
                              <span className="text-xs text-emerald-600 font-medium">Laba: {fmt.format(d.profit)}</span>
                              <span className="font-bold text-slate-900">{fmt.format(d.sales)}</span>
                            </div>
                          </div>
                          <div className="relative h-7 bg-slate-100 rounded-lg overflow-hidden">
                            <div 
                              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-2.5"
                              style={{ width: `${percentage}%` }}
                            >
                              {percentage > 18 && (
                                <span className="text-white text-[11px] font-semibold">
                                  {marginPercent}% margin
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 py-10">
                    Tidak ada transaksi pada periode ini
                  </div>
                )
              )}
            </Card>

            {/* Top Products Table */}
            <Card className="p-6 bg-white border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></span>
                  Produk Terlaris (Top 15)
                </h2>
                <span className="text-xs text-slate-500">Diurutkan berdasarkan kuantitas barang terjual</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      <TableHead className="w-12 font-bold text-slate-600">#</TableHead>
                      <TableHead className="font-bold text-slate-600">Nama Produk</TableHead>
                      <TableHead className="text-right font-bold text-slate-600">Terjual</TableHead>
                      <TableHead className="text-right font-bold text-slate-600">Omzet (Penjualan)</TableHead>
                      <TableHead className="text-right font-bold text-slate-600">Modal (HPP)</TableHead>
                      <TableHead className="text-right font-bold text-slate-600">Laba Bersih</TableHead>
                      <TableHead className="text-right font-bold text-slate-600">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.topProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                          Belum ada data produk terjual pada periode ini
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportData.topProducts.map((p, idx) => (
                        <TableRow key={idx} className="hover:bg-purple-50/30 transition-colors">
                          <TableCell className="font-bold text-purple-700">#{idx + 1}</TableCell>
                          <TableCell className="font-medium text-slate-800">{p.name}</TableCell>
                          <TableCell className="text-right">
                            <span className="px-2.5 py-0.5 bg-slate-100 font-semibold text-slate-800 rounded-md text-xs">
                              {p.quantity} pcs
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-900">{fmt.format(p.revenue)}</TableCell>
                          <TableCell className="text-right text-slate-600">{fmt.format(p.cost)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">{fmt.format(p.profit)}</TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              p.margin >= 25 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : p.margin >= 10 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {p.margin}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

          </div>
        )}

      </div>
    </div>
  )
}
