/**
 * Deterministic formatting helpers for currency and dates.
 * Guarantees 100% identical outputs on Server (SSR) and Client (Hydration),
 * permanently eliminating React Hydration Mismatch errors.
 */

export function formatRupiah(amount: number | string | null | undefined): string {
  const num = Math.round(Number(amount) || 0)
  return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatNumber(amount: number | string | null | undefined): string {
  const num = Math.round(Number(amount) || 0)
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatDateTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '-'
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return '-'

  const pad = (n: number) => n.toString().padStart(2, '0')

  // Treat as local date/time deterministically
  const day = pad(d.getDate())
  const month = pad(d.getMonth() + 1)
  const year = d.getFullYear()
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())

  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export function formatDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '-'
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return '-'

  const pad = (n: number) => n.toString().padStart(2, '0')
  const day = pad(d.getDate())
  const month = pad(d.getMonth() + 1)
  const year = d.getFullYear()

  return `${day}/${month}/${year}`
}

export function formatTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '-'
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return '-'

  const pad = (n: number) => n.toString().padStart(2, '0')
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  const seconds = pad(d.getSeconds())

  return `${hours}:${minutes}:${seconds}`
}

const INDONESIAN_DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const INDONESIAN_DAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const INDONESIAN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const INDONESIAN_MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function formatCompactRupiah(amount: number | null | undefined): string {
  const num = Math.round(Number(amount) || 0)
  if (num === 0) return 'Rp 0'
  if (num >= 1_000_000_000) {
    return 'Rp ' + (num / 1_000_000_000).toFixed(1).replace('.0', '').replace('.', ',') + ' M'
  }
  if (num >= 1_000_000) {
    return 'Rp ' + (num / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',') + ' jt'
  }
  if (num >= 1_000) {
    return 'Rp ' + (num / 1_000).toFixed(0) + ' rb'
  }
  return 'Rp ' + num
}

export function formatDayAndDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const dayName = INDONESIAN_DAYS_SHORT[d.getDay()]
  const dayNum = d.getDate().toString().padStart(2, '0')
  const monthName = INDONESIAN_MONTHS_SHORT[d.getMonth()]
  return `${dayName}, ${dayNum} ${monthName}`
}

export function formatFullIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const dayName = INDONESIAN_DAYS_FULL[d.getDay()]
  const dayNum = d.getDate()
  const monthName = INDONESIAN_MONTHS_FULL[d.getMonth()]
  const year = d.getFullYear()
  return `${dayName}, ${dayNum} ${monthName} ${year}`
}

