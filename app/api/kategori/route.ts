// API route untuk kategori (CRUD)
import prisma from "../../../lib/prisma"
import { Prisma } from '@prisma/client'

export async function GET() {
  // List categories
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  return new Response(JSON.stringify(categories), { status: 200 })
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
