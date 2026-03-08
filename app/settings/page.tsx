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
  const [autoBackupEnabled, setAutoBackupEnabled] = React.useState(false)
  const [backupScheduleType, setBackupScheduleType] = React.useState<'daily' | 'hourly' | 'weekly' | 'minutely'>('daily')
  const [backupHour, setBackupHour] = React.useState('02')
  const [backupMinute, setBackupMinute] = React.useState('00')
  const [backupInterval, setBackupInterval] = React.useState('6') // for hourly
  const [minuteInterval, setMinuteInterval] = React.useState('1') // for minutely
  const [backupDay, setBackupDay] = React.useState('0') // for weekly (0=Sunday)
  const [backupList, setBackupList] = React.useState<Array<{ name: string; size: number; date: number }>>([])
  const [showBackupList, setShowBackupList] = React.useState(false)

  // Convert simple schedule to cron expression
  const getCronExpression = () => {
    if (backupScheduleType === 'minutely') {
      return `*/${minuteInterval} * * * *`
    } else if (backupScheduleType === 'daily') {
      return `${backupMinute} ${backupHour} * * *`
    } else if (backupScheduleType === 'hourly') {
      return `${backupMinute} */${backupInterval} * * *`
    } else if (backupScheduleType === 'weekly') {
      return `${backupMinute} ${backupHour} * * ${backupDay}`
    }
    return '0 2 * * *' // fallback
  }

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

        // Load auto-backup status
        const backupRes = await fetch('/api/backup/auto')
        if (backupRes.ok) {
          const backupJson = await backupRes.json()
          if (mounted) setAutoBackupEnabled(backupJson.isRunning || false)
        }
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

  const handleToggleAutoBackup = async () => {
    try {
      const action = autoBackupEnabled ? 'stop' : 'start'
      const cronExpression = getCronExpression()
      const res = await fetch('/api/backup/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, cronExpression })
      })
      const json = await res.json()
      
      if (json.success) {
        setAutoBackupEnabled(!autoBackupEnabled)
        toast.success(autoBackupEnabled ? 'Auto-backup dinonaktifkan' : 'Auto-backup diaktifkan')
      } else {
        toast.error(json.error || 'Gagal mengubah status auto-backup')
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengubah status auto-backup')
    }
  }

  const loadBackupList = async () => {
    try {
      const res = await fetch('/api/backup/list')
      const json = await res.json()
      if (json.success) {
        setBackupList(json.backups)
        setShowBackupList(true)
      } else {
        toast.error('Gagal memuat daftar backup')
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat daftar backup')
    }
  }

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Hapus backup ${filename}?`)) return
    
    try {
      const res = await fetch(`/api/backup/delete?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' })
      const json = await res.json()
      
      if (json.success) {
        toast.success('Backup dihapus')
        loadBackupList() // Reload list
      } else {
        toast.error(json.error || 'Gagal menghapus backup')
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghapus backup')
    }
  }

  const handleRestoreBackup = async (filename: string) => {
    if (!confirm(`Restore database dari ${filename}? Data saat ini akan digantikan!`)) return
    
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      })
      const json = await res.json()
      
      if (json.success) {
        toast.success('Database berhasil direstore. Silakan refresh halaman.')
      } else {
        toast.error(json.error || 'Gagal restore database')
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal restore database')
    }
  }

  const handleDownloadBackup = async (filename: string) => {
    try {
      const res = await fetch(`/api/backup/download?filename=${encodeURIComponent(filename)}`)
      if (!res.ok) {
        toast.error('Gagal mengunduh backup')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
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
      toast.error('Gagal mengunduh backup')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp)
    return date.toLocaleString('id-ID', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

      {/* Auto Backup Section */}
      <section className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border-0 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">🔄 Backup Otomatis</h2>
          <p className="text-sm text-slate-600">Jadwalkan backup database secara otomatis</p>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex-1">
            <div className="font-medium text-slate-800">Status Auto-Backup</div>
            <div className="text-sm text-slate-500">
              {autoBackupEnabled ? '✅ Aktif - Backup berjalan otomatis sesuai jadwal' : '⚠️ Nonaktif - Backup hanya manual'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleAutoBackup}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoBackupEnabled ? 'bg-green-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoBackupEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Jadwal Backup</label>
            <select
              value={backupScheduleType}
              onChange={(e) => setBackupScheduleType(e.target.value as 'daily' | 'hourly' | 'weekly' | 'minutely')}
              disabled={autoBackupEnabled}
              className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="minutely">⚡ Setiap Beberapa Menit (Testing/Development)</option>
              <option value="daily">📅 Setiap Hari</option>
              <option value="hourly">⏰ Setiap Beberapa Jam</option>
              <option value="weekly">📆 Setiap Minggu</option>
            </select>
          </div>

          {backupScheduleType === 'minutely' && (
            <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-yellow-600 text-xl">⚠️</span>
                <div className="text-sm text-yellow-800">
                  <strong>Mode Testing/Development</strong>
                  <p className="mt-1">Backup setiap beberapa menit hanya untuk testing. Untuk production, gunakan jadwal Harian atau Jam.</p>
                </div>
              </div>
              <label className="block text-xs font-medium mb-2 text-slate-600">Interval (menit)</label>
              <select
                value={minuteInterval}
                onChange={(e) => setMinuteInterval(e.target.value)}
                disabled={autoBackupEnabled}
                className="w-full border rounded px-3 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="1">Setiap 1 menit ⚡</option>
                <option value="2">Setiap 2 menit</option>
                <option value="5">Setiap 5 menit</option>
                <option value="10">Setiap 10 menit</option>
                <option value="15">Setiap 15 menit</option>
                <option value="30">Setiap 30 menit</option>
              </select>
              <p className="text-xs text-yellow-700 mt-2 font-medium">
                ⚡ Backup akan berjalan setiap {minuteInterval} menit sekali
              </p>
            </div>
          )}

          {backupScheduleType === 'daily' && (
            <div className="flex gap-3 items-center bg-slate-50 p-4 rounded-lg">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-slate-600">Jam</label>
                <select
                  value={backupHour}
                  onChange={(e) => setBackupHour(e.target.value)}
                  disabled={autoBackupEnabled}
                  className="w-full border rounded px-2 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0')
                    return <option key={hour} value={hour}>{hour}:00</option>
                  })}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-slate-600">Menit</label>
                <select
                  value={backupMinute}
                  onChange={(e) => setBackupMinute(e.target.value)}
                  disabled={autoBackupEnabled}
                  className="w-full border rounded px-2 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {['00', '15', '30', '45'].map(min => (
                    <option key={min} value={min}>:{min}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-slate-600 pt-5">
                → Backup jam <strong>{backupHour}:{backupMinute}</strong>
              </div>
            </div>
          )}

          {backupScheduleType === 'hourly' && (
            <div className="bg-slate-50 p-4 rounded-lg">
              <label className="block text-xs font-medium mb-2 text-slate-600">Interval (jam)</label>
              <select
                value={backupInterval}
                onChange={(e) => setBackupInterval(e.target.value)}
                disabled={autoBackupEnabled}
                className="w-full border rounded px-3 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="1">Setiap 1 jam</option>
                <option value="2">Setiap 2 jam</option>
                <option value="3">Setiap 3 jam</option>
                <option value="4">Setiap 4 jam</option>
                <option value="6">Setiap 6 jam</option>
                <option value="8">Setiap 8 jam</option>
                <option value="12">Setiap 12 jam</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Backup akan berjalan setiap {backupInterval} jam sekali
              </p>
            </div>
          )}

          {backupScheduleType === 'weekly' && (
            <div className="flex gap-3 bg-slate-50 p-4 rounded-lg">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-2 text-slate-600">Hari</label>
                <select
                  value={backupDay}
                  onChange={(e) => setBackupDay(e.target.value)}
                  disabled={autoBackupEnabled}
                  className="w-full border rounded px-3 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="0">Minggu</option>
                  <option value="1">Senin</option>
                  <option value="2">Selasa</option>
                  <option value="3">Rabu</option>
                  <option value="4">Kamis</option>
                  <option value="5">Jumat</option>
                  <option value="6">Sabtu</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-2 text-slate-600">Jam</label>
                <select
                  value={backupHour}
                  onChange={(e) => setBackupHour(e.target.value)}
                  disabled={autoBackupEnabled}
                  className="w-full border rounded px-2 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0')
                    return <option key={hour} value={hour}>{hour}:00</option>
                  })}
                </select>
              </div>
            </div>
          )}

          <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded">
            ℹ️ <strong>Info:</strong> {getCronExpression() || 'Jadwal belum diatur'}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={loadBackupList}>
            📋 Lihat Daftar Backup
          </Button>
        </div>

        {/* Backup List Modal */}
        {showBackupList && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-xl font-bold">📦 Daftar Backup</h3>
                <button onClick={() => setShowBackupList(false)} className="text-slate-500 hover:text-slate-700">✕</button>
              </div>
              
              <div className="overflow-auto flex-1 p-6">
                {backupList.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">Belum ada backup tersimpan</div>
                ) : (
                  <div className="space-y-2">
                    {backupList.map((backup) => (
                      <div key={backup.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 truncate">{backup.name}</div>
                          <div className="text-sm text-slate-500">
                            {formatBytes(backup.size)} • {formatDate(backup.date)}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDownloadBackup(backup.name)}
                          >
                            ⬇️ Download
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRestoreBackup(backup.name)}
                          >
                            🔄 Restore
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteBackup(backup.name)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t bg-slate-50">
                <Button onClick={() => setShowBackupList(false)} className="w-full">Tutup</Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
