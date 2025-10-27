// API route untuk transaksi (create + list)
/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "../../../lib/prisma"
import { Prisma } from '@prisma/client'

type CreateItem = { productId?: number; quantity: number; price?: number; name?: string }

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { items, paid } = body
    if (!Array.isArray(items) || items.length === 0) return new Response(JSON.stringify({ error: 'Items are required' }), { status: 400 })
    if (typeof paid !== 'number' || !Number.isInteger(paid) || paid < 0) return new Response(JSON.stringify({ error: 'paid must be a non-negative integer' }), { status: 400 })

    // validate items: allow either productId (existing product) OR manual item with name + price
    const parsedItems: CreateItem[] = []
    for (const it of items) {
      const qty = Number(it.quantity)
      if (!Number.isInteger(qty) || qty <= 0) return new Response(JSON.stringify({ error: 'quantity must be a positive integer' }), { status: 400 })

      if (it.productId !== undefined && it.productId !== null) {
        const pid = Number(it.productId)
        if (!Number.isInteger(pid) || pid <= 0) return new Response(JSON.stringify({ error: 'productId must be a positive integer' }), { status: 400 })
        parsedItems.push({ productId: pid, quantity: qty, price: typeof it.price === 'number' ? it.price : undefined })
      } else {
        // manual item: must provide name and price
        const name = typeof it.name === 'string' ? it.name.trim() : ''
        const price = Number(it.price)
        if (!name) return new Response(JSON.stringify({ error: 'Manual item must include a name' }), { status: 400 })
        if (!Number.isInteger(price) || price < 0) return new Response(JSON.stringify({ error: 'Manual item price must be a non-negative integer' }), { status: 400 })
        parsedItems.push({ quantity: qty, price, name })
      }
    }

    // Use a transaction: for items with productId, check stock and use DB price if price not provided.
    const result = await prisma.$transaction(async (tx) => {
      const productIds = parsedItems.filter(i => i.productId).map(i => i.productId!)
      const products = productIds.length > 0 ? await tx.product.findMany({ where: { id: { in: productIds } } }) : []
      const prodMap = new Map<number, typeof products[0]>()
      for (const p of products) prodMap.set(p.id, p)

      // verify stock for product items
      for (const it of parsedItems) {
        if (it.productId) {
          const p = prodMap.get(it.productId)
          if (!p) throw new Error(`Produk dengan id ${it.productId} tidak ditemukan`)
          if (p.stock < it.quantity) throw new Error(`Stok tidak cukup untuk ${p.name || p.id}`)
        }
      }

      // compute totals and prepare create payloads
      let total = 0
      const itemsToCreate: Array<{ productId?: number | null; name?: string | null; price?: number | null; quantity: number; subtotal: number }> = []
      for (const i of parsedItems) {
        if (i.productId) {
          const p = prodMap.get(i.productId)!
          const unitPrice = i.price !== undefined ? i.price : p.price
          const subtotal = unitPrice * i.quantity
          total += subtotal
          itemsToCreate.push({ productId: i.productId, name: null, price: unitPrice, quantity: i.quantity, subtotal })
        } else {
          const unitPrice = i.price!
          const subtotal = unitPrice * i.quantity
          total += subtotal
          itemsToCreate.push({ productId: null, name: i.name!, price: unitPrice, quantity: i.quantity, subtotal })
        }
      }

      if (paid < total) throw new Error('Paid amount is less than total')

      // create transaction
      const created = await tx.transaction.create({ data: { total, paid, change: paid - total } })

      // create items and decrement stock for product items
      for (const it of itemsToCreate) {
        // Cast data to any because Prisma client types may be out-of-sync until migration is applied locally
        await tx.transactionItem.create({ data: ({ productId: it.productId, name: it.name ?? undefined, price: it.price ?? undefined, quantity: it.quantity, subtotal: it.subtotal, transactionId: created.id } as any) })
        if (it.productId) {
          await tx.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity } } })
        }
      }

      const withItems = await tx.transaction.findUnique({ where: { id: created.id }, include: { items: { include: { product: true } } } })
      return withItems
    })

    return new Response(JSON.stringify(result), { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') return new Response(JSON.stringify({ error: 'Record not found' }), { status: 404 })
      if (err.code === 'P2002') return new Response(JSON.stringify({ error: 'Unique constraint failed' }), { status: 409 })
    }
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), { status: 400 })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
    const perPage = Math.max(1, Number(url.searchParams.get('perPage') || '10'))
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const where: Prisma.TransactionWhereInput = {}
    if (from || to) {
      const createdAtFilter: Prisma.DateTimeFilter = {}
      if (from) createdAtFilter.gte = new Date(from)
      if (to) createdAtFilter.lte = new Date(to)
      where.createdAt = createdAtFilter
    }

    const total = await prisma.transaction.count({ where })
    const data = await prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage, include: { items: { include: { product: true } } } })

    return new Response(JSON.stringify({ data, total, page, perPage }), { status: 200 })
  } catch (err) {
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}

