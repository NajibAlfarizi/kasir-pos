import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const limit = Number(url.searchParams.get('limit') || '8')

    const rows = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    })

    return NextResponse.json(rows)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load recent transactions' }, { status: 500 })
  }
}
