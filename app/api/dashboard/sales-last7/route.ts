import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Revalidate every 10 minutes
export const revalidate = 600

export async function GET() {
  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6)
    sevenDaysAgo.setHours(0,0,0,0)

    // Single query with groupBy instead of 7 separate aggregate calls
    const results = await prisma.transaction.groupBy({
      by: ['createdAt'],
      _sum: { total: true },
      where: { 
        createdAt: { 
          gte: sevenDaysAgo,
          lt: new Date(now.getTime() + 86400000) // Until end of today
        }
      },
      orderBy: { createdAt: 'asc' },
    })

    // Create a map of date to total for quick lookup
    const dateMap = new Map<string, number>()
    results.forEach((r) => {
      const dateStr = new Date(r.createdAt).toISOString().slice(0, 10)
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + (r._sum.total || 0))
    })

    // Fill in missing days with 0
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      days.push({ date: dateStr, total: dateMap.get(dateStr) || 0 })
    }

    return NextResponse.json(days, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load sales' }, { status: 500 })
  }
}
