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
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Pengecekan Printer</SheetTitle>
          <SheetDescription>Kirim struk test ke printer yang terhubung pada server.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3 p-4">
          <label className="block text-sm">Label pada struk</label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={runCheck} disabled={loading}>{loading ? 'Mengirim...' : 'Kirim Test'}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
