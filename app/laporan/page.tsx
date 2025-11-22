"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

// Simple Card component
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>
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

type ReportData = {
  totalSales: number
  totalProfit: number
  totalTransactions: number
  avgBasket: number
  topProducts: Array<{ name: string; quantity: number; revenue: number; profit: number }>
  dailySales: Array<{ date: string; sales: number; profit: number; transactions: number }>
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

export default function LaporanPage() {
  const [periodType, setPeriodType] = React.useState<PeriodType>('daily')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [reportData, setReportData] = React.useState<ReportData | null>(null)

  const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

  // Set default dates based on period type
  React.useEffect(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    switch (periodType) {
      case 'daily':
        setStartDate(todayStr)
        setEndDate(todayStr)
        break
      case 'weekly':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay()) // Sunday
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6) // Saturday
        setStartDate(weekStart.toISOString().split('T')[0])
        setEndDate(weekEnd.toISOString().split('T')[0])
        break
      case 'monthly':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        setStartDate(monthStart.toISOString().split('T')[0])
        setEndDate(monthEnd.toISOString().split('T')[0])
        break
      case 'yearly':
        const yearStart = new Date(today.getFullYear(), 0, 1)
        const yearEnd = new Date(today.getFullYear(), 11, 31)
        setStartDate(yearStart.toISOString().split('T')[0])
        setEndDate(yearEnd.toISOString().split('T')[0])
        break
      default:
        setStartDate(todayStr)
        setEndDate(todayStr)
    }
  }, [periodType])

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Pilih tanggal mulai dan akhir')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/laporan?startDate=${startDate}&endDate=${endDate}`)
      if (!res.ok) {
        const json = await res.json()
        toast.error(json?.error || 'Gagal memuat laporan')
        return
      }

      const data = await res.json()
      setReportData(data)
      toast.success('Laporan berhasil dimuat')
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat laporan')
    } finally {
      setLoading(false)
    }
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
      : 'Custom'

    // Create CSV content
    let csv = `Laporan Penjualan ${periodLabel}\n`
    csv += `Periode: ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}\n\n`
    
    csv += `RINGKASAN\n`
    csv += `Total Penjualan,${reportData.totalSales}\n`
    csv += `Total Keuntungan,${reportData.totalProfit}\n`
    csv += `Total Transaksi,${reportData.totalTransactions}\n`
    csv += `Rata-rata per Transaksi,${Math.round(reportData.avgBasket)}\n`
    csv += `Margin Keuntungan,${reportData.totalSales > 0 ? ((reportData.totalProfit / reportData.totalSales) * 100).toFixed(1) : 0}%\n\n`
    
    csv += `PRODUK TERLARIS\n`
    csv += `Nama Produk,Jumlah Terjual,Pendapatan,Keuntungan,Margin\n`
    reportData.topProducts.forEach(p => {
      const margin = (p.profit / p.revenue) * 100
      csv += `${p.name},${p.quantity},${p.revenue},${p.profit},${margin.toFixed(1)}%\n`
    })
    
    csv += `\nPENJUALAN HARIAN\n`
    csv += `Tanggal,Penjualan,Keuntungan,Transaksi\n`
    reportData.dailySales.forEach(d => {
      csv += `${new Date(d.date).toLocaleDateString('id-ID')},${d.sales},${d.profit},${d.transactions}\n`
    })

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `laporan-${periodLabel.toLowerCase()}-${startDate}-${endDate}.csv`
    link.click()
    
    toast.success('Laporan berhasil diekspor')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        <header className="no-print">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">📊 Laporan Penjualan</h1>
          <p className="text-sm text-slate-600 mt-1">Analisis penjualan dan keuntungan berdasarkan periode</p>
        </header>

        {/* Filter Section */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg no-print">
        {/* Period Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Pilih Periode Laporan</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { value: 'daily', label: '📅 Harian', desc: 'Hari ini' },
              { value: 'weekly', label: '📆 Mingguan', desc: 'Minggu ini' },
              { value: 'monthly', label: '📊 Bulanan', desc: 'Bulan ini' },
              { value: 'yearly', label: '📈 Tahunan', desc: 'Tahun ini' },
              { value: 'custom', label: '⚙️ Custom', desc: 'Pilih tanggal' }
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setPeriodType(period.value as PeriodType)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  periodType === period.value
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow'
                }`}
              >
                <div className="font-semibold text-sm">{period.label}</div>
                <div className="text-xs text-slate-500 mt-1">{period.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Inputs */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Tanggal Mulai</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPeriodType('custom')
              }}
              className={periodType !== 'custom' ? 'bg-slate-50' : ''}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Tanggal Akhir</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPeriodType('custom')
              }}
              className={periodType !== 'custom' ? 'bg-slate-50' : ''}
            />
          </div>
          <Button onClick={handleGenerateReport} disabled={loading} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
            {loading ? <><Spinner /> Memuat...</> : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Buat Laporan
              </>
            )}
          </Button>
        </div>

        {/* Period Info Badge */}
        {startDate && endDate && (
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-slate-700">
                Periode: {new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} 
                {' '}-{' '}
                {new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="ml-auto text-purple-600 font-semibold">
                {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} hari
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Summary Cards */}
      {reportData && (
        <div id="printable-report" className="space-y-6">
          {/* Print Header */}
          <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-200">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Laporan Penjualan</h1>
            <div className="text-sm text-slate-600">
              <p>Periode: {new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-0 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Total Penjualan</div>
                  <div className="text-2xl font-bold">{fmt.format(reportData.totalSales)}</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Total Keuntungan</div>
                  <div className="text-2xl font-bold text-green-600">{fmt.format(reportData.totalProfit)}</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-sky-50 to-blue-50 border-0 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-lg shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Total Transaksi</div>
                  <div className="text-2xl font-bold">{reportData.totalTransactions}</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-0 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-lg shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Rata-rata / Transaksi</div>
                  <div className="text-2xl font-bold">{fmt.format(Math.round(reportData.avgBasket))}</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Additional Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 border-0 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-600">Margin Keuntungan</h3>
                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                {reportData.totalSales > 0 ? ((reportData.totalProfit / reportData.totalSales) * 100).toFixed(1) : 0}%
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Dari total penjualan
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-rose-50 to-pink-50 border-0 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-600">Produk Terjual</h3>
                <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                {reportData.topProducts.reduce((sum, p) => sum + p.quantity, 0)}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Total item terjual
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-0 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-600">Item per Transaksi</h3>
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <div className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                {reportData.totalTransactions > 0 
                  ? (reportData.topProducts.reduce((sum, p) => sum + p.quantity, 0) / reportData.totalTransactions).toFixed(1)
                  : 0
                }
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Rata-rata item
              </div>
            </Card>
          </div>

          {/* Daily Sales Chart */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></span>
              Grafik Penjualan Harian
            </h2>
            {reportData.dailySales.length > 0 ? (
              <div className="space-y-3">
                {reportData.dailySales.map((day, idx) => {
                  const maxSales = Math.max(...reportData.dailySales.map(d => d.sales))
                  const percentage = (day.sales / maxSales) * 100
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {new Date(day.date).toLocaleDateString('id-ID', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{day.transactions} transaksi</span>
                          <span className="font-bold text-emerald-600">{fmt.format(day.sales)}</span>
                        </div>
                      </div>
                      <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 15 && (
                            <span className="text-white text-xs font-semibold">
                              {((day.profit / day.sales) * 100).toFixed(0)}% margin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8">
                Tidak ada data penjualan
              </div>
            )}
          </Card>

          {/* Top Products */}
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></span>
              Produk Terlaris
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead className="text-right">Jumlah Terjual</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                    <TableHead className="text-right">Keuntungan</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.topProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        Tidak ada data produk
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.topProducts.map((product, idx) => {
                      const marginPercent = (product.profit / product.revenue) * 100
                      return (
                        <TableRow key={idx} className="hover:bg-purple-50/50 transition-colors">
                          <TableCell className="font-bold text-purple-600">#{idx + 1}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-right">
                            <span className="px-2 py-1 bg-slate-100 rounded-md font-semibold">
                              {product.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{fmt.format(product.revenue)}</TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">{fmt.format(product.profit)}</TableCell>
                          <TableCell className="text-right">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                              marginPercent > 30 ? 'bg-green-100 text-green-700' :
                              marginPercent > 15 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {marginPercent.toFixed(0)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Export Actions */}
          <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-0 shadow-lg no-print">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-700 text-white rounded-lg shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Export Laporan</h3>
                  <p className="text-xs text-slate-500">Simpan atau cetak laporan Anda</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportToCsv}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-200 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {!reportData && !loading && (
        <Card className="p-12 text-center no-print">
          <div className="text-slate-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Belum Ada Laporan</h3>
          <p className="text-sm text-slate-500">Pilih periode tanggal dan klik &quot;Buat Laporan&quot; untuk melihat data</p>
        </Card>
      )}
      </div>
    </div>
  )
}
