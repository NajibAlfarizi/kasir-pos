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
        setValues({
          storeName: json.storeName || json['store.name'] || json['storeName'] || '',
          storeAddress: json.storeAddress || json.address || '',
          storePhone: json.storePhone || json.phone || '',
          printerName: json.printerName || '',
          receiptHeader: json.receiptHeader || '',
          receiptFooter: json.receiptFooter || '',
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

  if (loading) return <div className="p-6 bg-white rounded-lg shadow"><Spinner /></div>

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Pengaturan Aplikasi</h1>
        <p className="text-sm text-slate-500">Atur nama toko, informasi kontak, dan printer struk.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-medium mb-1">Nama Toko</label>
          <Input value={values.storeName || ''} onChange={(e) => onChange('storeName', e.target.value)} />

          <label className="block text-sm font-medium mt-4 mb-1">Alamat</label>
          <textarea value={values.storeAddress || ''} onChange={(e) => onChange('storeAddress', e.target.value)} className="w-full border rounded px-2 py-2" rows={4} />

          <label className="block text-sm font-medium mt-4 mb-1">No. Telepon</label>
          <Input value={values.storePhone || ''} onChange={(e) => onChange('storePhone', e.target.value)} />
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-medium mb-1">Printer Struk (optional)</label>
          <Input value={values.printerName || ''} onChange={(e) => onChange('printerName', e.target.value)} placeholder="Nama printer atau descriptor" />

          <label className="block text-sm font-medium mt-4 mb-1">Header Struk</label>
          <textarea value={values.receiptHeader || ''} onChange={(e) => onChange('receiptHeader', e.target.value)} className="w-full border rounded px-2 py-2" rows={3} />

          <label className="block text-sm font-medium mt-4 mb-1">Footer Struk</label>
          <textarea value={values.receiptFooter || ''} onChange={(e) => onChange('receiptFooter', e.target.value)} className="w-full border rounded px-2 py-2" rows={3} />
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
