/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = 'nodejs'

import { join } from 'path'

export async function POST() {
  try {
    // try to import required modules
    let coreModule: unknown = undefined
    let UsbAdapterCtor: unknown = undefined
    // attempt dynamic import first
    let importErr: unknown = undefined
    try {
      coreModule = await import('@node-escpos/core')
      const usbMod = await import('@node-escpos/usb-adapter')
  UsbAdapterCtor = (usbMod as unknown as { default?: unknown }).default ?? (usbMod as unknown)
    } catch (err) {
      importErr = err
    }

    // fallback to require if import failed (some native packages are CJS)
    if (!coreModule || !UsbAdapterCtor) {
      try {
  // use createRequire to safely require CJS
  const { createRequire } = await import('module')
  const require = createRequire(import.meta.url)
  // require may throw if not present
  coreModule = coreModule ?? require('@node-escpos/core')
  const usbMod = require('@node-escpos/usb-adapter')
        UsbAdapterCtor = (usbMod && usbMod.default) ?? usbMod
      } catch (requireErr) {
        console.error('Print test import/require failed', { importErr, requireErr })
        return new Response(JSON.stringify({ error: 'Printing dependencies not available on server', details: String(importErr ?? requireErr) }), { status: 501 })
      }
    }

  const coreRec = coreModule as unknown as { Printer: unknown; Image?: unknown }
  const { Printer, Image } = coreRec as { Printer: any; Image?: any }

    const DeviceCtor = UsbAdapterCtor as unknown as new () => { open: (cb: (err?: unknown) => void) => void }
    const device = new DeviceCtor()

    // open device using callback form (example uses device.open(cb))
    await new Promise<void>((resolve, reject) => {
      try {
        device.open(function (err?: unknown) {
          if (err) return reject(err)
          resolve()
        })
      } catch (e) { reject(e) }
    })

    const options = { encoding: 'GB18030' }
    let printer = new Printer(device, options)

    // basic header & text
    printer.font('a').align('ct').style('bu').size(1, 1).text('TOKO MINIMARKET')
    printer.style('normal').text('Alamat: Jl. Contoh No.1')
    printer.text('Telp: 0812-XXX-XXXX')
    printer.text('')

    // sample items
    printer.align('lt')
    printer.tableCustom([
      { text: 'Produk', align: 'LEFT', width: 0.6 },
      { text: 'Qty', align: 'CENTER', width: 0.2 },
      { text: 'Subtotal', align: 'RIGHT', width: 0.2 }
    ])
    printer.tableCustom([
      { text: 'Contoh A', align: 'LEFT', width: 0.6 },
      { text: '1', align: 'CENTER', width: 0.2 },
      { text: 'Rp1000', align: 'RIGHT', width: 0.2 }
    ])

    // inject qrimage and barcode
    try {
      printer = await printer.qrimage('https://github.com/node-escpos/driver')
    } catch (e) {
      console.warn('qrimage not supported', e)
    }

    try {
      const filePath = join(process.cwd(), 'public', 'logo.png')
      const image = await Image.load(filePath)
      printer = await printer.image(image, 's8')
    } catch (e) {
      // ignore image load errors; not required
      console.warn('image load failed', e)
    }

    // cut and close the printer/device safely
    try {
      // some drivers implement cut() sync, others async — call and ignore errors on cut
      try { printer.cut() } catch (e) { console.warn('printer.cut() failed', e) }

      // printer.close may be sync or return a Promise; await if it's thenable
      if (printer && typeof (printer.close) === 'function') {
        try {
          const maybePromise = printer.close()
          if (maybePromise && typeof (maybePromise.then) === 'function') {
            await maybePromise
          }
        } catch (closeErr) {
          console.error('Printer close failed', closeErr)
          const isLibusbNotFound = closeErr && ((closeErr as any).errno === -5 || String(closeErr).includes('LIBUSB_ERROR_NOT_FOUND'))
          const details = isLibusbNotFound
            ? 'LIBUSB_ERROR_NOT_FOUND (errno -5): USB device not found. Check USB connection, replug the printer, and ensure correct driver (use Zadig to install WinUSB for the printer). Restart your Node process after changing drivers.'
            : String(closeErr)
          return new Response(JSON.stringify({ error: 'Printer close failed', details }), { status: 502 })
        }
      }
    } catch (e) {
      console.warn('Error while cutting/closing printer', e)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('Print test failed', err)
    // detect libusb device-not-found and return a specific, actionable message
    const e = err as any
    const isLibusbNotFound = e && (e.errno === -5 || String(e).includes('LIBUSB_ERROR_NOT_FOUND'))
    if (isLibusbNotFound) {
      return new Response(JSON.stringify({
        error: 'LIBUSB_ERROR_NOT_FOUND',
        details: 'USB device not found. Ensure the printer is connected, use Zadig to install the WinUSB driver for the printer (match VID/PID), replug the device, and restart the Node process. On some systems you may need to run the process with elevated permissions.'
      }), { status: 502 })
    }

    return new Response(JSON.stringify({ error: (err as Error)?.message || String(err) }), { status: 500 })
  }
}
