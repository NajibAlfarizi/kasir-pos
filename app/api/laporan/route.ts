import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function parseDateRange(startDateStr: string, endDateStr: string) {
  const [startY, startM, startD] = startDateStr.split('-').map(Number)
  const [endY, endM, endD] = endDateStr.split('-').map(Number)

  // Indonesia WIB is UTC+7 (7 hours ahead of UTC)
  const tzOffsetMs = 7 * 60 * 60 * 1000

  // Start of day in WIB (00:00:00.000)
  const startDate = new Date(Date.UTC(startY, startM - 1, startD, 0, 0, 0, 0) - tzOffsetMs)

  // End of day in WIB (23:59:59.999)
  const endDate = new Date(Date.UTC(endY, endM - 1, endD, 23, 59, 59, 999) - tzOffsetMs)

  return { startDate, endDate }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'startDate dan endDate wajib diisi (format YYYY-MM-DD)' }, { status: 400 })
    }

    const { startDate, endDate } = parseDateRange(startDateStr, endDateStr)

    // Get all transactions in the requested period
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

    // Summary totals
    let totalSales = 0
    let totalCost = 0
    let totalProfit = 0
    let totalCash = 0
    let totalQris = 0
    let countCash = 0
    let countQris = 0
    let totalItemsSold = 0
    const totalTransactions = transactions.length

    // Product statistics
    const productStats: Record<string, { id?: number; name: string; quantity: number; revenue: number; cost: number; profit: number }> = {}

    // Daily & Monthly sales aggregates
    const dailyStats: Record<string, { date: string; sales: number; cost: number; profit: number; transactions: number }> = {}
    const monthlyStats: Record<string, { month: string; sales: number; cost: number; profit: number; transactions: number }> = {}

    const jakartaDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })

    for (const tx of transactions) {
      totalSales += tx.total

      const isQris = (tx as any).paymentMethod === 'QRIS'
      if (isQris) {
        totalQris += tx.total
        countQris += 1
      } else {
        totalCash += tx.total
        countCash += 1
      }

      // Exact local date key in Asia/Jakarta (WIB)
      const txDate = new Date(tx.createdAt)
      const dateKey = jakartaDateFmt.format(txDate) // "YYYY-MM-DD"
      const monthKey = dateKey.substring(0, 7)      // "YYYY-MM"

      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { date: dateKey, sales: 0, cost: 0, profit: 0, transactions: 0 }
      }
      dailyStats[dateKey].sales += tx.total
      dailyStats[dateKey].transactions += 1

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { month: monthKey, sales: 0, cost: 0, profit: 0, transactions: 0 }
      }
      monthlyStats[monthKey].sales += tx.total
      monthlyStats[monthKey].transactions += 1

      let txCost = 0
      let txProfit = 0

      for (const item of tx.items) {
        const itemQty = Number(item.quantity) || 0
        const itemPrice = Number(item.price) || Number(item.product?.price) || 0
        const itemSubtotal = typeof item.subtotal === 'number' ? item.subtotal : (itemPrice * itemQty)
        const itemCostPrice = Number(item.product?.cost) || 0
        const itemTotalCost = itemCostPrice * itemQty
        const itemNetProfit = itemSubtotal - itemTotalCost

        totalCost += itemTotalCost
        totalProfit += itemNetProfit
        totalItemsSold += itemQty
        txCost += itemTotalCost
        txProfit += itemNetProfit

        // Product stats aggregation
        const prodKey = item.productId ? `id_${item.productId}` : (item.product?.name || item.name || 'Produk Tidak Diketahui')
        const prodName = item.product?.name || item.name || 'Produk Tidak Diketahui'

        if (!productStats[prodKey]) {
          productStats[prodKey] = {
            id: item.productId || undefined,
            name: prodName,
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          }
        }
        productStats[prodKey].quantity += itemQty
        productStats[prodKey].revenue += itemSubtotal
        productStats[prodKey].cost += itemTotalCost
        productStats[prodKey].profit += itemNetProfit
      }

      dailyStats[dateKey].cost += txCost
      dailyStats[dateKey].profit += txProfit
      monthlyStats[monthKey].cost += txCost
      monthlyStats[monthKey].profit += txProfit
    }

    // Top products sorted by quantity sold desc
    const topProducts = Object.values(productStats)
      .map(p => ({
        ...p,
        margin: p.revenue > 0 ? Number(((p.profit / p.revenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 15)

    // Daily sales sorted chronologically
    const dailySales = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date))

    // Monthly sales sorted chronologically
    const monthlySales = Object.values(monthlyStats).sort((a, b) => a.month.localeCompare(b.month))

    const avgBasket = totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0
    const avgItems = totalTransactions > 0 ? Number((totalItemsSold / totalTransactions).toFixed(1)) : 0
    const profitMargin = totalSales > 0 ? Number(((totalProfit / totalSales) * 100).toFixed(1)) : 0

    return NextResponse.json({
      startDate: startDateStr,
      endDate: endDateStr,
      totalSales,
      totalCost,
      totalProfit,
      profitMargin,
      totalTransactions,
      totalItemsSold,
      totalCash,
      totalQris,
      countCash,
      countQris,
      avgBasket,
      avgItems,
      topProducts,
      dailySales,
      monthlySales,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      }
    })
  } catch (err) {
    console.error('Error generating report:', err)
    return NextResponse.json({ error: 'Gagal membuat laporan penjualan' }, { status: 500 })
  }
}

