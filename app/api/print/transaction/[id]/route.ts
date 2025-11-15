/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = 'nodejs'

import prisma from '../../../../../lib/prisma'
import { join } from 'path'

async function loadPrinterModules() {
  let coreModule: any
  let UsbAdapter: any
  try {
    coreModule = await import('@node-escpos/core')
    const usbMod = await import('@node-escpos/usb-adapter')
    UsbAdapter = (usbMod as any).default ?? usbMod
  } catch (importErr) {
    try {
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      coreModule = coreModule ?? require('@node-escpos/core')
      const usbMod = require('@node-escpos/usb-adapter')
      UsbAdapter = (usbMod && usbMod.default) ?? usbMod
    } catch (requireErr) {
      throw new Error(`Printer modules not available: ${String(importErr ?? requireErr)}`)
    }
  }
  return { coreModule, UsbAdapter }
}

export async function POST(req: Request, context: any) {
  try {
    // params may be a promise in Next.js app router; await if needed
    let params = context?.params
    if (params && typeof params.then === 'function') params = await params
    params = params ?? {}
    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 })

    // Get copies parameter from query string (default to 1)
    const url = new URL(req.url)
    const copies = Math.max(1, Math.min(10, parseInt(url.searchParams.get('copies') || '1') || 1))
    console.log(`📄 Printing ${copies} copies of transaction ${id}`)

    const tx = await prisma.transaction.findUnique({ where: { id }, include: { items: { include: { product: true } } } })
    if (!tx) return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404 })

    // Load printer modules once
    const { coreModule, UsbAdapter } = await loadPrinterModules()
    const { Printer } = coreModule

    // Print multiple copies with device reopen for each copy
    for (let copyIndex = 0; copyIndex < copies; copyIndex++) {
      console.log(`🖨️ Printing copy ${copyIndex + 1}/${copies}`)
      
      const device = new UsbAdapter()
      await new Promise<void>((resolve, reject) => {
        try {
          device.open(function (err: any) {
            if (err) return reject(err)
            resolve()
          })
        } catch (e) { reject(e) }
      })

  const options = { encoding: 'GB18030' }
  let printer = new Printer(device, options)

    // helper: safe tableCustom caller - tries common signatures and falls back
    async function safeTableCustom(rows: any[], opts?: any) {
      if (!rows || !Array.isArray(rows)) return
      const tc = (printer as any).tableCustom
      if (typeof tc !== 'function') throw new Error('tableCustom not available')
      // try common signatures: rows only, rows + options
      try {
        // first try rows only
        const res = tc.call(printer, rows)
        if (res && typeof (res.then) === 'function') await res
        return
      } catch (err1) {
        try {
          const res2 = tc.call(printer, rows, opts)
          if (res2 && typeof (res2.then) === 'function') await res2
          return
        } catch (err2) {
          // rethrow last error
          throw err2 || err1
        }
      }
    }

    // currency formatter
    const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })

    // Header optimized for 58mm (RPP02)
    // RPP02 is an ESC/POS style thermal printer (58mm) — target ~32 chars per line
    const SEP = '-'.repeat(32)

    // Load app settings (store name, address, phone, receipt header/footer)
  const settingsMap: Record<string, string> = {}
    try {
      const srows = await (prisma as any).setting.findMany()
      for (const r of srows) settingsMap[String(r.key)] = String(r.value ?? '')
    } catch (e) {
      // ignore and fall back to defaults below
      console.warn('Failed to load settings for printing', e)
    }

    const storeName = settingsMap.storeName || settingsMap['store.name'] || 'KasirQu'
    const storeAddress = settingsMap.storeAddress || settingsMap.address || 'Dikembangkan oleh Najib Alfarizi'
    const storePhone = settingsMap.storePhone || settingsMap.phone || ''
    const receiptHeader = settingsMap.receiptHeader || ''
    const receiptFooter = settingsMap.receiptFooter || ''
    // Try printing a logo if present in public/logo.png (optional)
    try {
      const logoPath = join(process.cwd(), 'public', 'logo.png')
      // Image may not be supported by every driver; guard with try/catch
      if (typeof (printer as any).image === 'function') {
        const { Image } = (coreModule as any)
        try {
          const img = await Image.load(logoPath)
          printer = await printer.image(img, 's8')
        } catch {
          // ignore missing logo or load errors
        }
      }
    } catch {
      // ignore any logo errors
    }

    // header text (use settings when available)
    printer.font('a').align('ct')
    // Print store name larger below the header label
    try { printer.size(2, 2) } catch { /* ignore drivers that don't support size */ }
    printer.style('normal').text(storeName)
    // reset size to normal for following lines if supported
    try { printer.size(0, 0) } catch { /* ignore */ }
    // print phone (from settings) below the store name if present
    if (storePhone) {
      printer.text(`Tel: ${storePhone}`)
    }
    // print store address (always if configured)
    if (storeAddress) printer.text(storeAddress)
    // optional custom receipt header (printed after address if present)
    if (receiptHeader && receiptHeader.trim().length > 0) {
      for (const line of String(receiptHeader).split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
        printer.text(line)
      }
    }
    printer.text(SEP)

    // Transaction meta (date/time and note)
    const dateStr = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(tx.createdAt))
    printer.align('lt')
    printer.text(`${dateStr}`)
    printer.text(SEP)

    // Items (guard if items missing) - use compact columns for 58mm
    const items = tx.items ?? []
    for (const it of items) {
      // prefer explicit transaction-item name (manual item), else product name, else fallback
      const rawName = (it as any).name ?? it.product?.name ?? 'Produk'
      const nama = String(rawName).length > 28 ? String(rawName).slice(0, 28) + '…' : String(rawName)
      const jumlah = it.quantity ?? 1
      const unit = it.quantity ? ((it.subtotal ?? 0) / it.quantity) : (it.subtotal ?? 0)
      const hargaTotal = it.subtotal ?? 0
      const hargaTotalStr = String(fmt.format(hargaTotal))
      const qtyHargaStr = `${jumlah} x ${Number(unit || 0).toLocaleString('id-ID')}`
      printer.text(nama)

  // combine qty x unit (left) and hargaTotal (right) on one line
  const leftPart = qtyHargaStr.padEnd(20).slice(0, 20)
  const rightPart = hargaTotalStr.padStart(12)
  printer.text(leftPart + rightPart)
    }
  printer.text(SEP)
  // totals: try tableCustom but fallback to plain lines
    try {
      await safeTableCustom([
        { text: 'TOTAL', align: 'LEFT', width: 0.4, style: 'B' },
        { text: String(fmt.format(tx.total ?? 0)), align: 'RIGHT', width: 0.4, style: 'B' }
      ], { encoding: 'cp857' })
    } catch (tErr) {
      console.warn('printer.tableCustom failed for totals or unsupported signature, falling back', tErr)
      printer.text(`TOTAL ${String(fmt.format(tx.total ?? 0))}`)
    }
    printer.text('')
    // footer: use receiptFooter if provided, otherwise show polite default
    if (receiptFooter && String(receiptFooter).trim().length > 0) {
      for (const line of String(receiptFooter).split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
        printer.align('ct').text(line)
      }
    } else {
      printer.align('ct').text('Terima kasih')
      printer.align('ct').text('Barang yang sudah dibeli')
      printer.align('ct').text('Tidak dapat dikembalikan')
    }
  // optional support contact in footer removed — phone is printed in header already
    // Add credit lines (centered)
    printer.align('ct').text('Powered by Najib Alfarizi')
    printer.align('ct').text('CP : 082172634578')
    // cut and close safely
    try {
      try { printer.cut() } catch (e) { console.warn('printer.cut() failed', e) }
      if (printer && typeof (printer as any).close === 'function') {
        try {
          const maybe = (printer as any).close()
          if (maybe && typeof maybe.then === 'function') await maybe
        } catch (closeErr) {
          console.error('Printer close failed', closeErr)
          // return a useful message for libusb errors
          const isLibusbNotFound = closeErr && ((closeErr as any).errno === -5 || String(closeErr).includes('LIBUSB_ERROR_NOT_FOUND'))
          if (isLibusbNotFound) {
            return new Response(JSON.stringify({ error: 'LIBUSB_ERROR_NOT_FOUND', details: 'USB device not found while closing. Replug the printer, check driver (Zadig WinUSB), restart Node.' }), { status: 502 })
          }
        }
      }
    } catch (closeEx) {
      console.warn('Error during cut/close', closeEx)
    }

    // Small delay between copies
    if (copyIndex < copies - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } // End of copies loop

    return new Response(JSON.stringify({ ok: true, copies }), { status: 200 })
  } catch (err) {
    console.error('Print transaction failed', err)
    return new Response(JSON.stringify({ error: (err as Error).message || String(err) }), { status: 500 })
  }
}
