// API route untuk brand (CRUD)
import prisma from "../../../lib/prisma"
// When generated Prisma client types may lag schema edits, use a lightweight any alias
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const db: any = prisma
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const catRaw = url.searchParams.get('categoryId')
    const pageRaw = Number(url.searchParams.get('page') || '1')
    const perPageParam = url.searchParams.get('perPage')
    const perPageRaw = perPageParam === null ? null : Number(perPageParam)
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
    const perPage = perPageRaw === null ? null : (Number.isInteger(perPageRaw) && perPageRaw > 0 ? perPageRaw : 10)

  // permissive where shape to support contains on nested relations
  const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { category: { is: { name: { contains: q } } } },
      ]
    }

    // support filtering by category id (exact match)
    if (catRaw !== null && catRaw !== '') {
      const parsedCat = Number(catRaw)
      if (Number.isInteger(parsedCat)) {
        // exact match on FK
        ;(where as unknown as { categoryId?: number }).categoryId = parsedCat
      }
    }

    const total = await db.brand.count({ where })

    if (q || perPage !== null) {
      // fetch with pagination
      if (perPage === null) {
        const items = await db.brand.findMany({ where, orderBy: { name: 'asc' }, include: { category: true } })
        return new Response(JSON.stringify({ data: items, total, page: 1, perPage: items.length }), { status: 200 })
      }
      const items = await db.brand.findMany({ where, include: { category: true }, orderBy: { name: 'asc' }, skip: (page - 1) * perPage, take: perPage })
      return new Response(JSON.stringify({ data: items, total, page, perPage }), { status: 200 })
    }

    // default: return all brands
    const brands = await db.brand.findMany({ orderBy: { name: 'asc' }, include: { category: true } })
    return new Response(JSON.stringify({ data: brands, total: brands.length, page: 1, perPage: brands.length }), { status: 200 })
  } catch (err) {
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, categoryId } = body
    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 })
    }
    let catId: number | null = null
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      const parsed = Number(categoryId)
      if (!Number.isInteger(parsed)) return new Response(JSON.stringify({ error: 'categoryId must be an integer' }), { status: 400 })
      const cat = await db.category.findUnique({ where: { id: parsed } })
      if (!cat) return new Response(JSON.stringify({ error: 'Kategori tidak ditemukan' }), { status: 400 })
      catId = parsed
    }
  const created = await db.brand.create({ data: { name, ...(catId !== null ? { categoryId: catId } : {}) }, include: { category: true } })
    return new Response(JSON.stringify(created), { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return new Response(JSON.stringify({ error: 'Nama brand sudah ada' }), { status: 409 })
      }
    }
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
  const { id, name, categoryId } = body
    if (id === undefined || id === null) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 })
    const parsedId = Number(id)
    if (!Number.isInteger(parsedId)) return new Response(JSON.stringify({ error: 'id must be an integer' }), { status: 400 })
    let catId: number | null = null
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      const parsed = Number(categoryId)
      if (!Number.isInteger(parsed)) return new Response(JSON.stringify({ error: 'categoryId must be an integer' }), { status: 400 })
      const cat = await db.category.findUnique({ where: { id: parsed } })
      if (!cat) return new Response(JSON.stringify({ error: 'Kategori tidak ditemukan' }), { status: 400 })
      catId = parsed
    }
  const updated = await db.brand.update({ where: { id: parsedId }, data: { name, ...(catId !== null ? { categoryId: catId } : {}) }, include: { category: true } })
    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        return new Response(JSON.stringify({ error: 'Brand tidak ditemukan' }), { status: 404 })
      }
      if (err.code === 'P2002') {
        return new Response(JSON.stringify({ error: 'Nama brand sudah ada' }), { status: 409 })
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
  await db.brand.delete({ where: { id: Number(id) } })
    return new Response(null, { status: 204 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        return new Response(JSON.stringify({ error: 'Brand tidak ditemukan' }), { status: 404 })
      }
    }
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
