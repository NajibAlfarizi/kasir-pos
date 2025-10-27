import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0,0,0,0)

    const salesToday = await prisma.transaction.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: startOfDay } }
    })

    const transactionsToday = await prisma.transaction.count({ where: { createdAt: { gte: startOfDay } } })

    const avgBasket = transactionsToday ? (salesToday._sum.total || 0) / transactionsToday : 0

    const lowStockCount = await prisma.product.count({ where: { stock: { lte: 5 } } })

    return NextResponse.json({
      salesToday: salesToday._sum.total || 0,
      transactionsToday,
      avgBasket,
      lowStockCount,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
