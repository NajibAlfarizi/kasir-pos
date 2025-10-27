// Lightweight status endpoint for printer availability.
// It only checks whether the printing dependencies can be imported.
export async function GET() {
  try {
    await import('@node-escpos/core')
    await import('@node-escpos/usb-adapter')
    return new Response(JSON.stringify({ available: true }), { status: 200 })
  } catch {
    // If imports fail, print packages are unavailable
    return new Response(JSON.stringify({ available: false, message: 'Printing packages not installed or unavailable' }), { status: 200 })
  }
}
