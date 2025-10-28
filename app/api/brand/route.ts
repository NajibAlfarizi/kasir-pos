// API route untuk brand (CRUD)
import prisma from "../../../lib/prisma"
// When generated Prisma client types may lag schema edits, use a lightweight any alias
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const db: any = prisma
import { Prisma } from '@prisma/client'

export async function GET() {
  const brands = await db.brand.findMany({ orderBy: { name: 'asc' } })
  return new Response(JSON.stringify(brands), { status: 200 })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name } = body
    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 })
    }
  const created = await db.brand.create({ data: { name } })
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
    const { id, name } = body
    if (id === undefined || id === null) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 })
    const parsedId = Number(id)
    if (!Number.isInteger(parsedId)) return new Response(JSON.stringify({ error: 'id must be an integer' }), { status: 400 })
  const updated = await db.brand.update({ where: { id: parsedId }, data: { name } })
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
