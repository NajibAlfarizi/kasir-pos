"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Printer } from 'lucide-react'

export function PrintCheck() {
  const [open, setOpen] = React.useState(false)
  const [label, setLabel] = React.useState('Struk Tes')
  const [loading, setLoading] = React.useState(false)

  const runCheck = async () => {
    setLoading(true)
    try {
      const payload = {
        receipt: {
          total: 1000,
          paid: 2000,
          change: 1000,
          createdAt: new Date().toISOString(),
          items: [{ id: 1, product: { id: 1, name: label }, quantity: 1, subtotal: 1000 }]
        }
      }
      const res = await fetch('/api/print/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error || 'Print test gagal')
        return
      }
      toast.success('Perintah cetak test dikirim ke printer')
      setOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghubungi server cetak')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost"><Printer className="w-4 h-4 mr-2" />Cek Printer</Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md flex flex-col justify-between">
        <div>
          <SheetHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-slate-900">Pengecekan Printer</SheetTitle>
                <SheetDescription className="text-xs text-slate-500">Kirim struk uji coba ke printer thermal yang terpasang.</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Label pada Struk Uji Coba</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-lg h-9">
            Batal
          </Button>
          <Button
            size="sm"
            onClick={runCheck}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 text-xs font-medium shadow-xs"
          >
            {loading ? 'Mengirim...' : 'Kirim Struk Uji'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
