"use client"

import * as React from "react"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type ConfirmDialogProps = {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title = 'Konfirmasi',
  description,
  confirmLabel = 'Ya',
  cancelLabel = 'Batal',
  onConfirm,
  onClose
}: ConfirmDialogProps) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div aria-modal="true" role="dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200/80 z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <button 
                type="button" 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {description && <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{description}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg text-slate-700">
            {cancelLabel}
          </Button>
          <Button 
            size="sm" 
            onClick={() => { onConfirm(); onClose(); }} 
            className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

