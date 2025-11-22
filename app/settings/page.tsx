"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

type SettingsShape = {
  storeName?: string
  storeAddress?: string
  storePhone?: string
  printerName?: string
  receiptHeader?: string
  receiptFooter?: string
  autoPrint?: boolean
  printCopies?: number
}

export default function SettingsPage() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [backingUp, setBackingUp] = React.useState(false)
  const [values, setValues] = React.useState<SettingsShape>({})

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) throw new Error('Failed to load')
        const json = await res.json()
        if (!mounted) return
        const autoPrintValue = json.autoPrint || json['print.auto'] || ''
        const printCopiesValue = json.printCopies || json['print.copies'] || '1'
        setValues({
          storeName: json.storeName || json['store.name'] || json['storeName'] || '',
          storeAddress: json.storeAddress || json.address || '',
          storePhone: json.storePhone || json.phone || '',
          printerName: json.printerName || '',
          receiptHeader: json.receiptHeader || '',
          receiptFooter: json.receiptFooter || '',
          autoPrint: autoPrintValue === '1' || autoPrintValue === 'true' || autoPrintValue === true,
          printCopies: parseInt(printCopiesValue) || 1,
        })
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat pengaturan')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const onChange = (k: keyof SettingsShape, v: string) => setValues(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, string> = {}
      // send keys that the UI manages
      payload.storeName = values.storeName ?? ''
      payload.storeAddress = values.storeAddress ?? ''
      payload.storePhone = values.storePhone ?? ''
      payload.printerName = values.printerName ?? ''
      payload.receiptHeader = values.receiptHeader ?? ''
      payload.receiptFooter = values.receiptFooter ?? ''
      payload.autoPrint = values.autoPrint ? '1' : '0'
      payload.printCopies = String(values.printCopies ?? 1)

      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) {
        console.error(json)
        toast.error(json?.error || 'Gagal menyimpan pengaturan')
        return
      }
      toast.success('Pengaturan disimpan')
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  const handleBackup = async () => {
    setBackingUp(true)
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json?.error || 'Gagal membuat backup')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const disposition = res.headers.get('content-disposition')
      let filename = 'backup.db'
      if (disposition) {
        const m = /filename="?([^";]+)"?/.exec(disposition)
        if (m && m[1]) filename = m[1]
      }

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Backup berhasil diunduh')
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat backup')
    } finally {
      setBackingUp(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-6"><div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6"><Spinner /></div></div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">⚙️ Pengaturan Aplikasi</h1>
        <p className="text-sm text-slate-600">Atur nama toko, informasi kontak, dan printer struk.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border-0">
          <label className="block text-sm font-medium mb-1">Nama Toko</label>
          <Input value={values.storeName || ''} onChange={(e) => onChange('storeName', e.target.value)} />

          <label className="block text-sm font-medium mt-4 mb-1">Alamat</label>
          <textarea value={values.storeAddress || ''} onChange={(e) => onChange('storeAddress', e.target.value)} className="w-full border rounded px-2 py-2" rows={4} />

          <label className="block text-sm font-medium mt-4 mb-1">No. Telepon</label>
          <Input value={values.storePhone || ''} onChange={(e) => onChange('storePhone', e.target.value)} />
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border-0">
          <label className="block text-sm font-medium mb-1">Printer Struk (optional)</label>
          <Input value={values.printerName || ''} onChange={(e) => onChange('printerName', e.target.value)} placeholder="Nama printer atau descriptor" />

          <label className="block text-sm font-medium mt-4 mb-1">Header Struk</label>
          <textarea value={values.receiptHeader || ''} onChange={(e) => onChange('receiptHeader', e.target.value)} className="w-full border rounded px-2 py-2" rows={3} />

          <label className="block text-sm font-medium mt-4 mb-1">Footer Struk</label>
          <textarea value={values.receiptFooter || ''} onChange={(e) => onChange('receiptFooter', e.target.value)} className="w-full border rounded px-2 py-2" rows={3} />

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-sm font-medium">Auto Print Struk</label>
                <p className="text-xs text-slate-500 mt-1">Cetak struk otomatis setelah transaksi selesai</p>
              </div>
              <button
                type="button"
                onClick={() => setValues(s => ({ ...s, autoPrint: !s.autoPrint }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  values.autoPrint ? 'bg-sky-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    values.autoPrint ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <label className="block text-sm font-medium mb-1">Jumlah Copy Print</label>
            <Input
              type="number"
              min="1"
              max="10"
              value={values.printCopies || 1}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1
                setValues(s => ({ ...s, printCopies: Math.max(1, Math.min(10, val)) }))
              }}
              placeholder="1"
            />
            <p className="text-xs text-slate-500 mt-1">Berapa kali struk akan dicetak (1-10)</p>
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <span className="inline-flex items-center gap-2"><Spinner /> Menyimpan...</span> : 'Simpan'}
        </Button>
        <Button variant="ghost" onClick={() => { setValues({}); toast('Form dikosongkan') }}>Reset</Button>
        <Button variant="secondary" onClick={handleBackup} disabled={backingUp}>
          {backingUp ? <span className="inline-flex items-center gap-2"><Spinner /> Backup...</span> : 'Backup DB'}
        </Button>
      </div>
    </div>
  )
}
