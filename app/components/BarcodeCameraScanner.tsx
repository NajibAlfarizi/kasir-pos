"use client"

import * as React from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type Props = {
  open: boolean
  onClose: () => void
  onScanned: (barcode: string) => void
}

export default function BarcodeCameraScanner({ open, onClose, onScanned }: Props) {
  const [scanning, setScanning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const scannerRef = React.useRef<Html5Qrcode | null>(null)
  const qrCodeRegionId = "qr-reader"

  const stopScanner = React.useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (err) {
        console.warn("Error stopping scanner:", err)
      }
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  const startScanner = React.useCallback(async () => {
    if (scannerRef.current) return // Already initialized

    try {
      setError(null)
      setScanning(true)

      const html5QrCode = new Html5Qrcode(qrCodeRegionId)
      scannerRef.current = html5QrCode

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      }

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera on mobile
        config,
        (decodedText) => {
          // Successfully scanned
          console.log("Barcode detected:", decodedText)
          toast.success("Barcode terdeteksi!")
          onScanned(decodedText)
          stopScanner()
        },
        () => {
          // Scanning errors (can be ignored, happens frequently during continuous scanning)
        }
      )
    } catch (err) {
      console.error("Failed to start scanner:", err)
      const errMsg = err instanceof Error ? err.message : String(err)
      
      if (errMsg.includes("Permission denied") || errMsg.includes("NotAllowedError")) {
        setError("Izin akses camera ditolak. Silakan izinkan akses camera di browser.")
      } else if (errMsg.includes("NotFoundError") || errMsg.includes("not found")) {
        setError("Camera tidak ditemukan. Pastikan perangkat memiliki camera.")
      } else {
        setError("Gagal memulai scanner: " + errMsg)
      }
      
      toast.error("Gagal membuka camera")
      setScanning(false)
    }
  }, [onScanned, stopScanner])

  React.useEffect(() => {
    if (open) {
      startScanner()
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [open, startScanner, stopScanner])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scan Barcode</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm text-slate-600">{error}</p>
              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <p>Tips:</p>
                <ul className="list-disc list-inside text-left">
                  <li>Pastikan browser memiliki izin akses camera</li>
                  <li>Di Chrome: Settings → Privacy → Camera → Allow</li>
                  <li>Coba refresh halaman dan izinkan akses camera</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div
                id={qrCodeRegionId}
                className="w-full rounded-lg overflow-hidden border-2 border-sky-500"
                style={{ minHeight: "300px" }}
              />
              <div className="mt-4 text-center">
                <p className="text-sm text-slate-600 mb-2">
                  Arahkan camera ke barcode produk
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
                  <span>Scanning...</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          {error && (
            <Button
              onClick={() => {
                setError(null)
                startScanner()
              }}
              variant="outline"
            >
              Coba Lagi
            </Button>
          )}
          <Button onClick={onClose} variant="ghost">
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}
