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

    // Calculate profit today
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

    return NextResponse.json({
      salesToday: salesToday._sum.total || 0,
      transactionsToday,
      avgBasket,
      lowStockCount,
      profitToday,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
