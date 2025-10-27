// API route untuk produk (CRUD)
import prisma from "../../../lib/prisma"
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  // Support optional id query param to fetch single product, or server-side search + pagination
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
  const q = (url.searchParams.get('q') ?? '').trim()
  const pageRaw = Number(url.searchParams.get('page') || '1')
  const perPageRaw = Number(url.searchParams.get('perPage') || '10')
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const perPage = Number.isInteger(perPageRaw) && perPageRaw > 0 ? perPageRaw : 10
  const sortByParam = url.searchParams.get('sortBy') ?? 'name'
  const sortDirParam = (url.searchParams.get('sortDir') ?? 'asc').toLowerCase()
  const sortByArray = sortByParam.split(',').map(s => s.trim()).filter(Boolean)
  const sortDirArray = sortDirParam.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

    if (id) {
      const product = await prisma.product.findUnique({ where: { id: Number(id) }, include: { category: true } })
      if (!product) return new Response(JSON.stringify({ error: 'Produk tidak ditemukan' }), { status: 404 })
      return new Response(JSON.stringify(product), { status: 200 })
    }

  const where: Prisma.ProductWhereInput = {}
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { category: { is: { name: { contains: q } } } },
      ]
    }

    const total = await prisma.product.count({ where })

    // If query provided, do fuzzy ranking in JS (fetch candidates, score & sort), then paginate
    if (q) {
      // get candidates matching simple contains filter (to limit scope)
      const candidates = await prisma.product.findMany({ where, include: { category: true } })

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

      // compute score per candidate (name and category) and attach
      const scored = candidates.map((p) => {
        const nameScore = normalizedScore(p.name || '', q)
        const catScore = normalizedScore(p.category?.name || '', q)
        const score = Math.max(nameScore, catScore)
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
              aval = a.product.category?.name ?? ''
              bval = b.product.category?.name ?? ''
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
      const start = (page - 1) * perPage
      const end = start + perPage
      const pageItems = scored.slice(start, end).map(s => s.product)
      return new Response(JSON.stringify({ data: pageItems, total: totalMatches, page, perPage }), { status: 200 })
    }

    // No query: use database ordering and pagination (support multi-column)
    const allowed = ['name', 'price', 'stock', 'createdAt', 'category']
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

    const products = await prisma.product.findMany({
      where,
      orderBy: orderByArr.length ? orderByArr : { name: 'asc' },
      include: { category: true },
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
    const { name, price, stock, categoryId, cost } = body
    // stricter validation
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 })

    if (typeof price !== 'number' || !Number.isInteger(price) || price < 0) return new Response(JSON.stringify({ error: 'Price must be a non-negative integer' }), { status: 400 })
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) return new Response(JSON.stringify({ error: 'Stock must be a non-negative integer' }), { status: 400 })
    if (cost !== undefined) {
      if (typeof cost !== 'number' || !Number.isInteger(cost) || cost < 0) return new Response(JSON.stringify({ error: 'Cost must be a non-negative integer' }), { status: 400 })
    }

    let catId: number | null = null
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      const parsed = Number(categoryId)
      if (!Number.isInteger(parsed)) return new Response(JSON.stringify({ error: 'categoryId must be an integer' }), { status: 400 })
      // verify category exists
      const cat = await prisma.category.findUnique({ where: { id: parsed } })
      if (!cat) return new Response(JSON.stringify({ error: 'Kategori tidak ditemukan' }), { status: 400 })
      catId = parsed
    }

    // Build payload and cast to Prisma type to satisfy TS when client types lag schema updates
    const payload = { name: trimmedName, price, cost: cost ?? 0, stock, categoryId: catId } as unknown as Prisma.ProductCreateInput
    const created = await prisma.product.create({ data: payload })
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
    const { id, name, price, stock, categoryId, cost } = body
    if (id === undefined || id === null) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 })
    const parsedId = Number(id)
    if (!Number.isInteger(parsedId)) return new Response(JSON.stringify({ error: 'id must be an integer' }), { status: 400 })

    // stricter validation for fields
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 })
    if (typeof price !== 'number' || !Number.isInteger(price) || price < 0) return new Response(JSON.stringify({ error: 'Price must be a non-negative integer' }), { status: 400 })
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) return new Response(JSON.stringify({ error: 'Stock must be a non-negative integer' }), { status: 400 })

    let catId: number | null = null
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      const parsed = Number(categoryId)
      if (!Number.isInteger(parsed)) return new Response(JSON.stringify({ error: 'categoryId must be an integer' }), { status: 400 })
      const cat = await prisma.category.findUnique({ where: { id: parsed } })
      if (!cat) return new Response(JSON.stringify({ error: 'Kategori tidak ditemukan' }), { status: 400 })
      catId = parsed
    }

    // include cost if provided; cast to Prisma type to avoid TS errors when types are out of sync
    const updateData = { name: trimmedName, price, stock, categoryId: catId, ...(cost !== undefined ? { cost } : {}) } as unknown as Prisma.ProductUpdateInput
    const updated = await prisma.product.update({ where: { id: parsedId }, data: updateData })
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
