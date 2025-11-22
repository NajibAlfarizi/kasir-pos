import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 })
    }

    const startDate = new Date(startDateStr)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(endDateStr)
    endDate.setHours(23, 59, 59, 999)

    // Get all transactions in the period
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Calculate summary
    let totalSales = 0
    let totalProfit = 0
    const totalTransactions = transactions.length

    // Product statistics
    const productStats: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {}

    // Daily sales
    const dailyStats: Record<string, { sales: number; profit: number; transactions: number }> = {}

    for (const tx of transactions) {
      totalSales += tx.total

      for (const item of tx.items) {
        const itemPrice = item.price || (item.product?.price ?? 0)
        const itemCost = item.product?.cost ?? 0
        const itemProfit = (itemPrice - itemCost) * item.quantity

        totalProfit += itemProfit

        // Product stats
        const productName = item.product?.name || item.name || 'Produk Tidak Diketahui'
        if (!productStats[productName]) {
          productStats[productName] = {
            name: productName,
            quantity: 0,
            revenue: 0,
            profit: 0,
          }
        }
        productStats[productName].quantity += item.quantity
        productStats[productName].revenue += item.subtotal
        productStats[productName].profit += itemProfit
      }

      // Daily stats
      const dateKey = tx.createdAt.toISOString().split('T')[0]
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { sales: 0, profit: 0, transactions: 0 }
      }
      dailyStats[dateKey].sales += tx.total
      dailyStats[dateKey].transactions += 1

      // Calculate profit for this transaction
      let txProfit = 0
      for (const item of tx.items) {
        const itemPrice = item.price || (item.product?.price ?? 0)
        const itemCost = item.product?.cost ?? 0
        txProfit += (itemPrice - itemCost) * item.quantity
      }
      dailyStats[dateKey].profit += txProfit
    }

    // Sort products by quantity sold
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // Convert daily stats to array and sort by date
    const dailySales = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        ...stats,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const avgBasket = totalTransactions > 0 ? totalSales / totalTransactions : 0

    return NextResponse.json({
      totalSales,
      totalProfit,
      totalTransactions,
      avgBasket,
      topProducts,
      dailySales,
    })
  } catch (err) {
    console.error('Error generating report:', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
