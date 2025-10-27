/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "../../../lib/prisma"

export async function GET() {
  try {
    const rows = await (prisma as any).setting.findMany()
    const out: Record<string, string> = {}
    for (const r of rows) out[r.key] = r.value
    return new Response(JSON.stringify(out), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Failed to load settings' }), { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    if (!body || typeof body !== 'object') return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })

    const keys = Object.keys(body)
    const updated: Record<string, string> = {}
    for (const k of keys) {
      const raw = (body as unknown) as Record<string, unknown>
      const v = String(raw[k] ?? '')
      const r = await (prisma as any).setting.upsert({ where: { key: k }, update: { value: v }, create: { key: k, value: v } })
      updated[r.key] = r.value
    }

    return new Response(JSON.stringify(updated), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Failed to save settings' }), { status: 500 })
  }
}
