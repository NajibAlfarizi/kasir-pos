import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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
    // Exclude null productId groups (manual items) and fetch product details
    const filtered = rows.filter((r) => r.productId !== null) as Array<typeof rows[number] & { productId: number }>
    const result = await Promise.all(filtered.map(async r => {
      const product = await prisma.product.findUnique({ where: { id: r.productId } })
      return {
        productId: r.productId,
        name: product?.name || 'Unknown',
        sold: (r._sum.quantity ?? 0) as number,
      }
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load top products' }, { status: 500 })
  }
}
