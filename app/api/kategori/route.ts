// API route untuk kategori (CRUD)
import prisma from "../../../lib/prisma"
import { Prisma } from '@prisma/client'

// Revalidate categories every 1 hour (static data, rarely changes)
export const revalidate = 3600

export async function GET(req: Request) {
  // List categories with pagination support
  try {
    const url = new URL(req.url)
    const pageRaw = Number(url.searchParams.get('page') || '1')
    const perPageParam = url.searchParams.get('perPage')
    const perPageRaw = perPageParam === null ? 10 : Number(perPageParam) // Default: 10 per page
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
    const perPage = Number.isInteger(perPageRaw) && perPageRaw > 0 ? perPageRaw : 10

    // Support simple search
    const q = (url.searchParams.get('q') ?? '').trim()
    const where: Record<string, unknown> = {}
    if (q) {
      where.name = { contains: q }
    }

    const total = await prisma.category.count({ where })
    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
    })

    return new Response(
      JSON.stringify({ data: categories, total, page, perPage }),
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        }
      }
    )
  } catch (err) {
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, description } = body
    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 })
    }
    const created = await prisma.category.create({ data: { name, description } })
    return new Response(JSON.stringify(created), { status: 201 })
  } catch (err) {
    // Prisma error mapping
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint failed
      if (err.code === 'P2002') {
        return new Response(JSON.stringify({ error: 'Nama kategori sudah ada' }), { status: 409 })
      }
    }
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, name, description } = body
    if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 })
    const updated = await prisma.category.update({ where: { id: Number(id) }, data: { name, description } })
    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Record to update not found
      if (err.code === 'P2025') {
        return new Response(JSON.stringify({ error: 'Kategori tidak ditemukan' }), { status: 404 })
      }
      // Unique constraint on update
      if (err.code === 'P2002') {
        return new Response(JSON.stringify({ error: 'Nama kategori sudah ada' }), { status: 409 })
      }
    }
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 })
    await prisma.category.delete({ where: { id: Number(id) } })
    return new Response(null, { status: 204 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        return new Response(JSON.stringify({ error: 'Kategori tidak ditemukan' }), { status: 404 })
      }
    }
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
