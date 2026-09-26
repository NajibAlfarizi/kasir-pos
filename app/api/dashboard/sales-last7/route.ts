import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Revalidate every 5 minutes
export const revalidate = 300

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const daysParam = parseInt(url.searchParams.get('days') || '7', 10)
    const daysCount = Math.min(Math.max(isNaN(daysParam) ? 7 : daysParam, 1), 90)

    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(now.getDate() - (daysCount - 1))
    startDate.setHours(0, 0, 0, 0)

    // Aggregate transactions within date range
    const results = await prisma.transaction.groupBy({
      by: ['createdAt'],
      _sum: { total: true },
      _count: { id: true },
      where: { 
        createdAt: { 
          gte: startDate,
          lt: new Date(now.getTime() + 86400000) // Until end of today
        }
      },
      orderBy: { createdAt: 'asc' },
    })

    // Create a map of date to totals and counts
    const dateMap = new Map<string, { total: number; count: number }>()
    results.forEach((r) => {
      const dateStr = new Date(r.createdAt).toISOString().slice(0, 10)
      const existing = dateMap.get(dateStr) || { total: 0, count: 0 }
      dateMap.set(dateStr, {
        total: existing.total + (r._sum.total || 0),
        count: existing.count + (r._count?.id || 1),
      })
    })

    // Fill in missing days with 0
    const days = []
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const data = dateMap.get(dateStr) || { total: 0, count: 0 }
      days.push({ 
        date: dateStr, 
        total: data.total, 
        count: data.count 
      })
    }

    return NextResponse.json(days, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    })
  } catch (err) {
    console.error('Failed to load dashboard sales chart data:', err)
    return NextResponse.json({ error: 'Failed to load sales' }, { status: 500 })
  }
}

