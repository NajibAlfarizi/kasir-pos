export const runtime = 'nodejs'

type ReceiptItem = { id: number; product?: { id: number; name: string } | null; quantity: number; subtotal: number }
type Receipt = { id?: number; total: number; paid: number; change: number; createdAt: string; items: ReceiptItem[] }

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const receipt: Receipt | undefined = body.receipt
    if (!receipt) return new Response(JSON.stringify({ error: 'receipt payload is required' }), { status: 400 })

    // Try to dynamically import node-escpos modules. If not installed, return helpful message.
    // import types via narrow constructor signatures to avoid `any` lint errors
    type PrinterInstance = {
      font: (arg: string) => PrinterInstance
      align: (arg: string) => PrinterInstance
      style: (arg: string) => PrinterInstance
      size: (w: number, h: number) => PrinterInstance
      text: (s: string) => PrinterInstance
      tableCustom: (rows: unknown[], opts?: unknown) => PrinterInstance
      cut: () => PrinterInstance
      close?: () => Promise<void> | void
      qrimage?: (s: string) => Promise<PrinterInstance>
      image?: (img: unknown, mode?: string) => Promise<PrinterInstance>
    }
    type PrinterCtor = new (device: unknown, options?: unknown) => PrinterInstance
    type UsbAdapterCtor = new () => { open: (cb: (err?: unknown) => void) => void }

    let PrinterClass: PrinterCtor | undefined
    let UsbAdapterClass: UsbAdapterCtor | undefined
    try {
      const core = await import('@node-escpos/core')
      PrinterClass = (core as unknown as { Printer?: PrinterCtor }).Printer
      const usbMod = await import('@node-escpos/usb-adapter')
      UsbAdapterClass = (usbMod as unknown as { default?: UsbAdapterCtor }).default
    } catch (err) {
      console.error('Print import failed', err)
      return new Response(JSON.stringify({ error: 'Printing dependencies not found. Install @node-escpos/core and @node-escpos/usb-adapter on the server.' }), { status: 501 })
    }

    if (!PrinterClass || !UsbAdapterClass) {
      return new Response(JSON.stringify({ error: 'Printer adapter not available' }), { status: 501 })
    }

    // Create device and printer
  const device = new UsbAdapterClass()

    // Promisify device.open which uses a callback
    await new Promise<void>((resolve, reject) => {
      try {
        device.open(function (err?: unknown) {
          if (err) return reject(err)
          resolve()
        })
      } catch (err) { reject(err) }
    })

  const options = { encoding: 'GB18030' }
  const printer = new PrinterClass(device, options)

    // Format date/time to WIB
    const dt = new Date(receipt.createdAt || Date.now())
    const dateStr = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(dt)

    // Header (store info) - customize as needed
    printer
      .font('a')
      .align('ct')
      .style('b')
      .size(1, 1)
      .text('TOKO MINIMART')
      .style('normal')
      .text('Alamat: Kubu Induak Ayam')
      .text('Telp: 0823-1111-0111')
      .text('')
      .align('lt')

    // Transaction header
    printer
      .text(`Tgl : ${dateStr}`)
      .text('-------------------------------')

    // Items: print name, qty x price, subtotal. Use tableCustom to align columns.
    for (const it of receipt.items) {
      const name = (it.product?.name || 'Produk').slice(0, 20)
      // left: name, middle: qty x price, right: subtotal
      printer.tableCustom([
        { text: name, align: 'LEFT', width: 0.5 },
        { text: `x${it.quantity}`, align: 'CENTER', width: 0.15 },
        { text: String(it.subtotal), align: 'RIGHT', width: 0.35 },
      ], { encoding: 'cp857' })
    }

    printer.text('-------------------------------')
    printer.tableCustom([
      { text: 'TOTAL', align: 'LEFT', width: 0.6, style: 'B' },
      { text: String(receipt.total), align: 'RIGHT', width: 0.4, style: 'B' }
    ], { encoding: 'cp857' })
    printer.tableCustom([
      { text: 'BAYAR', align: 'LEFT', width: 0.6 },
      { text: String(receipt.paid), align: 'RIGHT', width: 0.4 }
    ], { encoding: 'cp857' })
    printer.tableCustom([
      { text: 'KEMBALIAN', align: 'LEFT', width: 0.6 },
      { text: String(receipt.change), align: 'RIGHT', width: 0.4 }
    ], { encoding: 'cp857' })

    printer.text('')
    printer.align('ct').text('Terima kasih atas kunjungan Anda')
    printer.text('Barang yang sudah dibeli tidak dapat dikembalikan')

    // cut and close
    printer.cut()
    // attempt to close if function exists (avoid ts-ignore)
      try {
      const maybeClose = (printer as unknown as { close?: (() => Promise<void> | void) }).close
      if (typeof maybeClose === 'function') {
        const result = maybeClose.call(printer)
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          await (result as unknown as Promise<unknown>)
        }
      }
    } catch (closeErr) {
      console.warn('Printer close failed', closeErr)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    const e = err as Error
    console.error('Print handler error', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
