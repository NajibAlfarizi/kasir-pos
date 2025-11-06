// API route untuk produk (CRUD)
import prisma from "../../../lib/prisma"
/* eslint-disable @typescript-eslint/no-explicit-any */
const db: any = prisma
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  // Support optional id query param to fetch single product, or server-side search + pagination
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
  const q = (url.searchParams.get('q') ?? '').trim()
  const pageRaw = Number(url.searchParams.get('page') || '1')
  // If perPage is omitted we will return all items (no pagination). If provided, parse it.
  const perPageParam = url.searchParams.get('perPage')
  const perPageRaw = perPageParam === null ? null : Number(perPageParam)
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const perPage = perPageRaw === null ? null : (Number.isInteger(perPageRaw) && perPageRaw > 0 ? perPageRaw : 10)
  const sortByParam = url.searchParams.get('sortBy') ?? 'name'
  const sortDirParam = (url.searchParams.get('sortDir') ?? 'asc').toLowerCase()
  const sortByArray = sortByParam.split(',').map(s => s.trim()).filter(Boolean)
  const sortDirArray = sortDirParam.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

    if (id) {
      const product = await db.product.findUnique({ where: { id: Number(id) }, include: { category: true, brand: true } })
      if (!product) return new Response(JSON.stringify({ error: 'Produk tidak ditemukan' }), { status: 404 })
      return new Response(JSON.stringify(product), { status: 200 })
    }

  // Use a permissive any-typed where to avoid TS issues when generated Prisma types
  // may be out-of-sync during iterative development. This keeps runtime behavior
  // intact while avoiding strict compile errors; remove `any` once types are up-to-date.
  const where: any = {}
    // filter by brandId and categoryId when provided
    const brandParam = url.searchParams.get('brandId')
    if (brandParam !== null && brandParam !== '') {
      const parsedBrand = Number(brandParam)
      if (Number.isInteger(parsedBrand)) where.brandId = parsedBrand
    }
    const categoryParam = url.searchParams.get('categoryId')
    if (categoryParam !== null && categoryParam !== '') {
      const parsedCat = Number(categoryParam)
      if (Number.isInteger(parsedCat)) where.categoryId = parsedCat
    }
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { barcode: { contains: q } },
        { category: { is: { name: { contains: q } } } },
        { brand: { is: { name: { contains: q } } } },
      ]
    }

  const total = await db.product.count({ where })

    // If query provided, do fuzzy ranking in JS (fetch candidates, score & sort), then paginate
    if (q) {
      // get candidates matching simple contains filter (to limit scope)
  const candidates = await db.product.findMany({ where, include: ({ category: true, brand: true } as any) })

      // Levenshtein distance implementation
      const levenshtein = (a: string, b: string) => {
        const A = a || ''
        const B = b || ''
        const m = A.length
        const n = B.length
        const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
        for (let i = 0; i <= m; i++) dp[i][0] = i
        for (let j = 0; j <= n; j++) dp[0][j] = j
        for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
            const cost = A[i - 1] === B[j - 1] ? 0 : 1
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
          }
        }
        return dp[m][n]
      }

      const normalizedScore = (s: string, qstr: string) => {
        const a = (s || '').toLowerCase()
        const b = (qstr || '').toLowerCase()
        if (!a && !b) return 1
        if (!a || !b) return 0
        const dist = levenshtein(a, b)
        const maxLen = Math.max(a.length, b.length)
        return maxLen === 0 ? 1 : 1 - dist / maxLen
      }

  // compute score per candidate (name, category, brand) and attach
  const scored = (candidates as any[]).map((p: any) => {
    const nameScore = normalizedScore(p.name || '', q)
    const catScore = normalizedScore(p.category?.name || '', q)
    const brandScore = normalizedScore(p.brand?.name || '', q)
    const score = Math.max(nameScore, catScore, brandScore)
    return { product: p, score }
  })

      // primary sort: fuzzy score desc
      scored.sort((a, b) => b.score - a.score)

      // secondary multi-column sort using sortByArray & sortDirArray
      if (sortByArray.length > 0) {
        scored.sort((a, b) => {
          // if score differs significantly, keep order by score
          const diff = b.score - a.score
          if (Math.abs(diff) > 1e-6) return diff > 0 ? 1 : -1
          for (let i = 0; i < sortByArray.length; i++) {
            const key = sortByArray[i]
            const dir = (sortDirArray[i] === 'desc') ? -1 : 1
            let aval: unknown = (a.product as unknown as Record<string, unknown>)[key]
            let bval: unknown = (b.product as unknown as Record<string, unknown>)[key]
            if (key === 'category') {
              aval = (a.product as any).category?.name ?? ''
              bval = (b.product as any).category?.name ?? ''
            }
            if (key === 'brand') {
              aval = (a.product as any).brand?.name ?? ''
              bval = (b.product as any).brand?.name ?? ''
            }
            const avalStr = aval === null || aval === undefined ? '' : String(aval)
            const bvalStr = bval === null || bval === undefined ? '' : String(bval)
            if (avalStr < bvalStr) return -1 * dir
            if (avalStr > bvalStr) return 1 * dir
          }
          return 0
        })
      }

      const totalMatches = scored.length
      if (perPage === null) {
        // return all matches when perPage omitted
        const pageItems = scored.map(s => s.product)
        return new Response(JSON.stringify({ data: pageItems, total: totalMatches, page: 1, perPage: totalMatches }), { status: 200 })
      }
      const start = (page - 1) * perPage
      const end = start + perPage
      const pageItems = scored.slice(start, end).map(s => s.product)
      return new Response(JSON.stringify({ data: pageItems, total: totalMatches, page, perPage }), { status: 200 })
    }

    // No query: use database ordering and pagination (support multi-column)
  const allowed = ['name', 'price', 'stock', 'createdAt', 'category', 'brand']
    const orderByArr: Prisma.ProductOrderByWithRelationInput[] = []
    for (let i = 0; i < sortByArray.length; i++) {
      const col = sortByArray[i]
      const dir = (sortDirArray[i] === 'desc') ? 'desc' : 'asc'
      if (!allowed.includes(col)) continue
      if (col === 'category') {
        orderByArr.push({ category: { name: dir as Prisma.SortOrder } })
      } else {
        orderByArr.push({ [col]: dir as Prisma.SortOrder } as Prisma.ProductOrderByWithRelationInput)
      }
    }

    if (perPage === null) {
  const products = await db.product.findMany({ where, orderBy: orderByArr.length ? orderByArr : { name: 'asc' }, include: ({ category: true, brand: true } as any) })
      return new Response(JSON.stringify({ data: products, total, page: 1, perPage: products.length }), { status: 200 })
    }

    const products = await db.product.findMany({
      where,
      orderBy: orderByArr.length ? orderByArr : { name: 'asc' },
      include: ({ category: true, brand: true } as any),
      skip: (page - 1) * perPage,
      take: perPage,
    })

    return new Response(JSON.stringify({ data: products, total, page, perPage }), { status: 200 })
  } catch (err) {
    const e = err as unknown
    console.error('GET /api/produk failed', e)
  const obj = (e && typeof e === 'object') ? (e as Record<string, unknown>) : null
  const message = obj && 'message' in obj ? String(obj.message) : String(e)
  const stack = obj && 'stack' in obj ? String(obj.stack) : null
    // return stack for easier debugging in development
    return new Response(JSON.stringify({ error: message, stack }), { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
  const { name, price, stock, categoryId, cost, brandId, barcode } = body
    // stricter validation
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 })

    if (typeof price !== 'number' || !Number.isInteger(price) || price < 0) return new Response(JSON.stringify({ error: 'Price must be a non-negative integer' }), { status: 400 })
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) return new Response(JSON.stringify({ error: 'Stock must be a non-negative integer' }), { status: 400 })
    if (cost !== undefined) {
      if (typeof cost !== 'number' || !Number.isInteger(cost) || cost < 0) return new Response(JSON.stringify({ error: 'Cost must be a non-negative integer' }), { status: 400 })
    }

    const trimmedBarcode = barcode && typeof barcode === 'string' ? barcode.trim() : null
    if (trimmedBarcode && trimmedBarcode.length > 0) {
      // Check for duplicate barcode
      const existing = await db.product.findUnique({ where: { barcode: trimmedBarcode } })
      if (existing) return new Response(JSON.stringify({ error: 'Barcode sudah digunakan oleh produk lain' }), { status: 409 })
    }

    let catId: number | null = null
    let brId: number | null = null
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      const parsed = Number(categoryId)
      if (!Number.isInteger(parsed)) return new Response(JSON.stringify({ error: 'categoryId must be an integer' }), { status: 400 })
      // verify category exists
      const cat = await db.category.findUnique({ where: { id: parsed } })
      if (!cat) return new Response(JSON.stringify({ error: 'Kategori tidak ditemukan' }), { status: 400 })
      catId = parsed
    }
    if (brandId !== undefined && brandId !== null && brandId !== '') {
      const parsedB = Number(brandId)
      if (!Number.isInteger(parsedB)) return new Response(JSON.stringify({ error: 'brandId must be an integer' }), { status: 400 })
      const br = await db.brand.findUnique({ where: { id: parsedB } })
      if (!br) return new Response(JSON.stringify({ error: 'Brand tidak ditemukan' }), { status: 400 })
      brId = parsedB
    }

    // Build payload and cast to Prisma type to satisfy TS when client types lag schema updates
  const payload: any = { name: trimmedName, price, cost: cost ?? 0, stock }
  if (catId !== null) payload.categoryId = catId
  if (brId !== null) payload.brandId = brId
  if (trimmedBarcode && trimmedBarcode.length > 0) payload.barcode = trimmedBarcode
  const created = await db.product.create({ data: payload })
    return new Response(JSON.stringify(created), { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return new Response(JSON.stringify({ error: 'Produk dengan nama yang sama sudah ada' }), { status: 409 })
      }
    }
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, name, price, stock, categoryId, cost, brandId, barcode } = body
    if (id === undefined || id === null) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 })
    const parsedId = Number(id)
    if (!Number.isInteger(parsedId)) return new Response(JSON.stringify({ error: 'id must be an integer' }), { status: 400 })

    // stricter validation for fields
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 })
    if (typeof price !== 'number' || !Number.isInteger(price) || price < 0) return new Response(JSON.stringify({ error: 'Price must be a non-negative integer' }), { status: 400 })
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) return new Response(JSON.stringify({ error: 'Stock must be a non-negative integer' }), { status: 400 })

    const trimmedBarcode = barcode && typeof barcode === 'string' ? barcode.trim() : null
    if (trimmedBarcode && trimmedBarcode.length > 0) {
      // Check for duplicate barcode (excluding current product)
      const existing = await db.product.findUnique({ where: { barcode: trimmedBarcode } })
      if (existing && existing.id !== parsedId) return new Response(JSON.stringify({ error: 'Barcode sudah digunakan oleh produk lain' }), { status: 409 })
    }

    let catId: number | null = null
    let brId: number | null = null
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      const parsed = Number(categoryId)
      if (!Number.isInteger(parsed)) return new Response(JSON.stringify({ error: 'categoryId must be an integer' }), { status: 400 })
      const cat = await db.category.findUnique({ where: { id: parsed } })
      if (!cat) return new Response(JSON.stringify({ error: 'Kategori tidak ditemukan' }), { status: 400 })
      catId = parsed
    }
    if (brandId !== undefined && brandId !== null && brandId !== '') {
      const parsedB = Number(brandId)
      if (!Number.isInteger(parsedB)) return new Response(JSON.stringify({ error: 'brandId must be an integer' }), { status: 400 })
      const br = await db.brand.findUnique({ where: { id: parsedB } })
      if (!br) return new Response(JSON.stringify({ error: 'Brand tidak ditemukan' }), { status: 400 })
      brId = parsedB
    }

    // include cost if provided; cast to Prisma type to avoid TS errors when types are out of sync
  const updateData: any = { name: trimmedName, price, stock }
  if (catId !== null) updateData.categoryId = catId
  if (brId !== null) updateData.brandId = brId
  if (cost !== undefined) updateData.cost = cost
  if (trimmedBarcode !== null) updateData.barcode = trimmedBarcode.length > 0 ? trimmedBarcode : null
  const updated = await db.product.update({ where: { id: parsedId }, data: updateData })
    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        return new Response(JSON.stringify({ error: 'Produk tidak ditemukan' }), { status: 404 })
      }
      if (err.code === 'P2002') {
        return new Response(JSON.stringify({ error: 'Produk dengan nama yang sama sudah ada' }), { status: 409 })
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
    await prisma.product.delete({ where: { id: Number(id) } })
    return new Response(null, { status: 204 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        return new Response(JSON.stringify({ error: 'Produk tidak ditemukan' }), { status: 404 })
      }
    }
    const e = err as Error
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
