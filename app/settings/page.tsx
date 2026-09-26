"use client"

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Settings,
  Store,
  Printer,
  QrCode,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Download,
  RotateCw,
  AlertTriangle,
  Clock,
  Database,
  X,
  Calendar,
  Zap,
} from 'lucide-react'
import { formatDateTime } from '@/lib/format'

type SettingsShape = {
  storeName?: string
  storeAddress?: string
  storePhone?: string
  printerName?: string
  receiptHeader?: string
  receiptFooter?: string
  autoPrint?: boolean
  printCopies?: number
  qrisImage?: string
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
          qrisImage: json.qrisImage || '',
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
      payload.qrisImage = values.qrisImage ?? ''

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
    return formatDateTime(timestamp)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-100 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-slate-700">Pengaturan</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pengaturan Aplikasi</h1>
            <p className="text-xs text-slate-500">Konfigurasi profil toko, printer struk, QRIS, dan pencadangan database.</p>
          </div>
        </div>
      </div>

      {/* Grid: Profil Toko & Printer Struk */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profil Toko */}
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Profil Toko</h2>
              <p className="text-xs text-slate-500">Informasi identitas toko yang tercantum di struk</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Toko</label>
              <Input
                placeholder="Contoh: Minimarket Barokah"
                value={values.storeName || ''}
                onChange={(e) => onChange('storeName', e.target.value)}
                className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat Lengkap</label>
              <textarea
                placeholder="Alamat toko yang akan tercetak di bagian atas struk..."
                value={values.storeAddress || ''}
                onChange={(e) => onChange('storeAddress', e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[90px] resize-y"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">No. Telepon / WhatsApp</label>
              <Input
                placeholder="0812-xxxx-xxxx"
                value={values.storePhone || ''}
                onChange={(e) => onChange('storePhone', e.target.value)}
                className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Printer & Struk */}
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Pengaturan Printer & Struk</h2>
              <p className="text-xs text-slate-500">Konfigurasi format cetak dan koneksi printer thermal</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Printer Thermal</label>
              <Input
                value={values.printerName || ''}
                onChange={(e) => onChange('printerName', e.target.value)}
                placeholder="Contoh: POS-58 atau Printer Struk (opsional)"
                className="h-9 rounded-lg border-slate-200 text-sm focus-visible:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Kosongkan jika menggunakan dialog cetak bawaan browser</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Header Tambahan</label>
                <textarea
                  value={values.receiptHeader || ''}
                  onChange={(e) => onChange('receiptHeader', e.target.value)}
                  placeholder="Pesan di bawah nama toko..."
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-indigo-500 min-h-[70px] resize-y"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Footer Struk</label>
                <textarea
                  value={values.receiptFooter || ''}
                  onChange={(e) => onChange('receiptFooter', e.target.value)}
                  placeholder="Terima kasih atas kunjungan Anda..."
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-indigo-500 min-h-[70px] resize-y"
                  rows={2}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => setValues(s => ({ ...s, autoPrint: !s.autoPrint }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    values.autoPrint ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      values.autoPrint ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Auto-Print Struk</span>
                  <span className="text-[11px] text-slate-500">Cetak otomatis setelah transaksi</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Jumlah Salinan:</label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={values.printCopies || 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1
                    setValues(s => ({ ...s, printCopies: Math.max(1, Math.min(5, val)) }))
                  }}
                  className="w-16 h-8 text-center text-xs rounded-lg border-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* QRIS Toko Card */}
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200/80 p-5 md:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">QRIS Toko (Pembayaran Non-Tunai)</h2>
                <p className="text-xs text-slate-500">Unggah barcode QRIS toko Anda agar dapat ditampilkan di layar kasir untuk pelanggan</p>
              </div>
            </div>
            {values.qrisImage ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                QRIS Terpasang
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200 self-start sm:self-auto">
                Belum Terpasang
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Unggah Gambar QRIS</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 2 * 1024 * 1024) {
                      toast.error('Ukuran gambar maksimal 2MB')
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = (evt) => {
                      const res = evt.target?.result as string
                      setValues(s => ({ ...s, qrisImage: res }))
                      toast.success('Gambar QRIS berhasil dimuat, klik Simpan untuk menyimpan')
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">Format didukung: PNG, JPG, JPEG, WebP (maksimal 2MB).</p>
              </div>

              {values.qrisImage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setValues(s => ({ ...s, qrisImage: '' }))
                    toast.info('Gambar QRIS dihapus. Klik Simpan untuk menerapkan perubahan.')
                  }}
                  className="h-8 rounded-lg text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Hapus Gambar QRIS
                </Button>
              )}
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50/80 rounded-xl border border-dashed border-slate-300 min-h-[160px]">
              {values.qrisImage ? (
                <div className="text-center space-y-2">
                  <img
                    src={values.qrisImage}
                    alt="Preview QRIS Toko"
                    className="max-h-44 max-w-full rounded-lg object-contain mx-auto shadow-xs border border-slate-200"
                  />
                  <span className="text-[11px] text-slate-500 font-medium block">Tampilan QRIS Kasir</span>
                </div>
              ) : (
                <div className="text-center text-slate-400 space-y-1.5 py-4">
                  <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
                  <div className="text-xs font-medium text-slate-500">Belum ada gambar QRIS</div>
                  <div className="text-[10px] text-slate-400">Unggah file QRIS toko di samping</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-medium"
        >
          {saving ? (
            <>
              <Spinner className="mr-1.5" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1.5" />
              Simpan Pengaturan
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setValues({}); toast('Form dikosongkan') }}
          className="rounded-lg h-9 border-slate-200 text-slate-600 hover:text-slate-900"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset Form
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackup}
          disabled={backingUp}
          className="rounded-lg h-9 border-slate-200 text-slate-600 hover:text-slate-900"
        >
          {backingUp ? (
            <>
              <Spinner className="mr-1.5" />
              Membuat Backup...
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Unduh Backup Database
            </>
          )}
        </Button>
      </div>

      {/* Auto Backup Section */}
      <section className="bg-white rounded-xl shadow-2xs border border-slate-200/80 p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <RotateCw className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Pencadangan Database Otomatis</h2>
            <p className="text-xs text-slate-500">Jadwalkan backup berkala otomatis untuk mengamankan data transaksi</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Status Auto-Backup</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {autoBackupEnabled
                ? 'Aktif — Pencadangan otomatis aktif sesuai jadwal cron yang ditentukan'
                : 'Nonaktif — Pencadangan hanya dilakukan secara manual'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleAutoBackup}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
              autoBackupEnabled ? 'bg-emerald-600' : 'bg-slate-300'
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pilihan Jadwal</label>
            <select
              value={backupScheduleType}
              onChange={(e) => setBackupScheduleType(e.target.value as 'daily' | 'hourly' | 'weekly' | 'minutely')}
              disabled={autoBackupEnabled}
              className="w-full sm:w-80 border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 disabled:bg-slate-100 disabled:cursor-not-allowed focus:outline-hidden focus:border-indigo-500"
            >
              <option value="daily">Setiap Hari (Rekomendasi)</option>
              <option value="hourly">Setiap Beberapa Jam</option>
              <option value="weekly">Setiap Minggu</option>
              <option value="minutely">Setiap Beberapa Menit (Testing / Pengujian)</option>
            </select>
          </div>

          {backupScheduleType === 'minutely' && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <strong className="font-semibold">Mode Testing / Pengembangan</strong>
                  <p className="mt-0.5">Interval menit hanya untuk pengujian. Untuk operasional toko, gunakan jadwal Harian.</p>
                </div>
              </div>
              <div className="pt-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Interval Menit</label>
                <select
                  value={minuteInterval}
                  onChange={(e) => setMinuteInterval(e.target.value)}
                  disabled={autoBackupEnabled}
                  className="w-48 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white disabled:bg-slate-100"
                >
                  <option value="1">Setiap 1 menit</option>
                  <option value="2">Setiap 2 menit</option>
                  <option value="5">Setiap 5 menit</option>
                  <option value="10">Setiap 10 menit</option>
                  <option value="15">Setiap 15 menit</option>
                  <option value="30">Setiap 30 menit</option>
                </select>
              </div>
            </div>
          )}

          {backupScheduleType === 'daily' && (
            <div className="flex flex-wrap gap-3 items-center bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Jam</label>
                <select
                  value={backupHour}
                  onChange={(e) => setBackupHour(e.target.value)}
                  disabled={autoBackupEnabled}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white disabled:bg-slate-100 w-24"
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0')
                    return <option key={hour} value={hour}>{hour}:00</option>
                  })}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Menit</label>
                <select
                  value={backupMinute}
                  onChange={(e) => setBackupMinute(e.target.value)}
                  disabled={autoBackupEnabled}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white disabled:bg-slate-100 w-24"
                >
                  {['00', '15', '30', '45'].map(min => (
                    <option key={min} value={min}>:{min}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-slate-600 sm:pt-4">
                Waktu eksekusi: <span className="font-semibold text-slate-800">{backupHour}:{backupMinute} WIB</span>
              </div>
            </div>
          )}

          {backupScheduleType === 'hourly' && (
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 w-full sm:w-80">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Interval Jam</label>
              <select
                value={backupInterval}
                onChange={(e) => setBackupInterval(e.target.value)}
                disabled={autoBackupEnabled}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white disabled:bg-slate-100"
              >
                <option value="1">Setiap 1 jam</option>
                <option value="2">Setiap 2 jam</option>
                <option value="3">Setiap 3 jam</option>
                <option value="4">Setiap 4 jam</option>
                <option value="6">Setiap 6 jam</option>
                <option value="8">Setiap 8 jam</option>
                <option value="12">Setiap 12 jam</option>
              </select>
            </div>
          )}

          {backupScheduleType === 'weekly' && (
            <div className="flex flex-wrap gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Hari</label>
                <select
                  value={backupDay}
                  onChange={(e) => setBackupDay(e.target.value)}
                  disabled={autoBackupEnabled}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white disabled:bg-slate-100 w-32"
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
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Jam</label>
                <select
                  value={backupHour}
                  onChange={(e) => setBackupHour(e.target.value)}
                  disabled={autoBackupEnabled}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white disabled:bg-slate-100 w-24"
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i.toString().padStart(2, '0')
                    return <option key={hour} value={hour}>{hour}:00</option>
                  })}
                </select>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60 font-mono">
            Ekspresi Cron: {getCronExpression() || 'Jadwal belum diatur'}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBackupList}
            className="rounded-lg h-9 border-slate-200 text-slate-700 hover:text-slate-900"
          >
            <Database className="w-3.5 h-3.5 mr-1.5" />
            Lihat Daftar File Backup
          </Button>
        </div>

        {/* Backup List Modal */}
        {showBackupList && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-slate-200/80 animate-in zoom-in-95">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-semibold text-slate-900">Daftar File Backup Database</h3>
                </div>
                <button
                  onClick={() => setShowBackupList(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-auto flex-1 p-4">
                {backupList.length === 0 ? (
                  <div className="text-center text-slate-400 py-12">
                    <Database className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">Belum ada file backup tersimpan</p>
                    <p className="text-xs text-slate-400 mt-0.5">Lakukan backup manual atau aktifkan auto-backup</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {backupList.map((backup) => (
                      <div
                        key={backup.name}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100/80 border border-slate-200/60 gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-800 font-mono truncate">{backup.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatBytes(backup.size)} • {formatDate(backup.date)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadBackup(backup.name)}
                            className="h-8 px-2.5 rounded-lg border-slate-200 text-xs"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Unduh
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreBackup(backup.name)}
                            className="h-8 px-2.5 rounded-lg border-slate-200 text-xs text-amber-700 hover:bg-amber-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBackup(backup.name)}
                            className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowBackupList(false)} className="rounded-lg">
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

