import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Revalidate every 5 minutes for dashboard
export const revalidate = 300

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limit = Number(url.searchParams.get('limit') || '5')

    // Aggregate sold quantities grouped by productId
    const rows = await prisma.transactionItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    })
    // Exclude null productId groups
    const productIds = rows
      .filter((r) => r.productId !== null)
      .map((r) => r.productId as number)
    
    // Fetch all products in a single query instead of N+1
    if (productIds.length === 0) {
      return NextResponse.json([])
    }
    
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })
    
    // Map products back to results
    const productMap = new Map(products.map(p => [p.id, p]))
    const result = rows
      .filter((r) => r.productId !== null)
      .map((r) => ({
        productId: r.productId,
        name: productMap.get(r.productId as number)?.name || 'Unknown',
        sold: (r._sum.quantity ?? 0) as number,
      }))

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
