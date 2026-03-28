import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { calculateItemsProfit } from '@/lib/profit-calculation'

// Revalidate summary every 30 seconds (frequent updates for dashboard)
export const revalidate = 30

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

    // Calculate profit today using utility function
    const transactionsToday_items = await prisma.transactionItem.findMany({
      where: { 
        transaction: { createdAt: { gte: startOfDay } }
      },
      include: { product: { select: { cost: true, price: true } } }
    })

    const profitToday = calculateItemsProfit(transactionsToday_items)

    return NextResponse.json({
      salesToday: salesToday._sum.total || 0,
      transactionsToday,
      avgBasket,
      lowStockCount,
      profitToday,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
