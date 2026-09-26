import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Revalidate every 5 minutes for dashboard
export const revalidate = 300

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limit = Number(url.searchParams.get('limit') || '5')

    // Aggregate sold quantities and subtotal grouped by productId (excluding nulls)
    const rows = await prisma.transactionItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, subtotal: true },
      where: { productId: { not: null } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    })
    
    const productIds = rows
      .filter((r) => r.productId !== null)
      .map((r) => r.productId as number)
    
    // Fetch all products in a single query
    if (productIds.length === 0) {
      return NextResponse.json([])
    }
    
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true, category: { select: { name: true } } },
    })
    
    // Map products back to results
    const productMap = new Map(products.map(p => [p.id, p]))
    const result = rows.map((r) => {
      const prod = productMap.get(r.productId as number)
      return {
        productId: r.productId,
        name: prod?.name || 'Unknown',
        category: prod?.category?.name || 'Umum',
        sold: (r._sum.quantity ?? 0) as number,
        revenue: (r._sum.subtotal ?? 0) as number,
      }
    })

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load top products' }, { status: 500 })
  }
}
