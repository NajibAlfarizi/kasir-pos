import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      d.setHours(0,0,0,0)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)

      const total = await prisma.transaction.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: d, lt: next } }
      })

      days.push({ date: d.toISOString().slice(0,10), total: total._sum.total || 0 })
    }

    return NextResponse.json(days)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load sales' }, { status: 500 })
  }
}
