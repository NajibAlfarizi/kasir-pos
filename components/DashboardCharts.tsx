"use client"

import React, { useEffect, useRef, useState } from 'react'

type ChartCtorType = new (ctx: CanvasRenderingContext2D | null, cfg: unknown) => { destroy?: () => void }

type SalesPoint = { date: string; total: number }
type TopProduct = { productId: string; name: string; sold: number }

export default function DashboardCharts() {
  const lineRef = useRef<HTMLCanvasElement | null>(null)
  const barRef = useRef<HTMLCanvasElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let lineChart: { destroy?: () => void } | null = null
    let barChart: { destroy?: () => void } | null = null

    async function init() {
      try {
        const [salesRes, topRes] = await Promise.all([
          fetch('/api/dashboard/sales-last7'),
          fetch('/api/dashboard/top-products?limit=5'),
        ])
        const sales: SalesPoint[] = await salesRes.json()
        const tops: TopProduct[] = await topRes.json()

        // dynamic import Chart.js
        const ChartModule = await import('chart.js/auto')
        const maybe = (ChartModule as unknown) as { default?: unknown }
        const ChartCtor = (maybe.default as unknown as ChartCtorType) ?? ((window as unknown) as ChartCtorType)
        if (!ChartCtor) {
          throw new Error('Chart.js not found. Please install chart.js')
        }

        if (lineRef.current) {
          // ensure canvas has explicit sizing so Chart.js can compute layout
          lineRef.current.style.width = '100%'
          lineRef.current.style.height = '100%'
          const ctx = lineRef.current.getContext('2d')
          lineChart = new ChartCtor(ctx, {
            type: 'line',
            data: {
              labels: sales.map(s => s.date),
              datasets: [
                {
                  label: 'Penjualan (Rp)',
                  data: sales.map(s => s.total),
                  backgroundColor: 'rgba(34,197,94,0.2)',
                  borderColor: 'rgba(34,197,94,1)',
                  fill: true,
                },
              ],
            },
            options: { responsive: true, maintainAspectRatio: false },
          })
        }

        if (barRef.current) {
          barRef.current.style.width = '100%'
          barRef.current.style.height = '100%'
          const ctx = barRef.current.getContext('2d')
          barChart = new ChartCtor(ctx, {
            type: 'bar',
            data: {
              labels: tops.map(t => t.name),
              datasets: [
                {
                  label: 'Terjual (qty)',
                  data: tops.map(t => t.sold),
                  backgroundColor: 'rgba(99,102,241,0.8)',
                },
              ],
            },
            options: { responsive: true, maintainAspectRatio: false },
          })
        }

        setLoading(false)
      } catch (err: unknown) {
        console.error(err)
        const e = err as Error
        setError(e?.message ?? String(err))
        setLoading(false)
      }
    }

    init()

    return () => {
      try {
        if (lineChart && lineChart.destroy) { lineChart.destroy() }
        if (barChart && barChart.destroy) { barChart.destroy() }
      } catch {
        // ignore
      }
    }
  }, [])

  if (loading) return <div className="p-4">Memuat grafik...</div>
  if (error) return (
    <div className="p-4 text-sm text-red-600">
      Gagal memuat grafik: {error}. Jika pesan menyebutkan &quot;chart.js&quot;, jalankan <code>npm install chart.js</code> lalu restart dev server.
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-md p-4 h-64 shadow-sm">
        <h3 className="font-medium mb-2">Penjualan 7 Hari</h3>
        <div className="h-full"><canvas ref={lineRef} className="w-full h-full" /></div>
      </div>
      <div className="bg-white rounded-md p-4 h-64 shadow-sm">
        <h3 className="font-medium mb-2">Produk Teratas</h3>
        <div className="h-full"><canvas ref={barRef} className="w-full h-full" /></div>
      </div>
    </div>
  )
}
