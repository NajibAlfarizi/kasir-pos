"use client"

import * as React from "react"

export default function BrandSelect({ value, onChange, categoryId }: { value?: number | null; onChange?: (v: number) => void; categoryId?: number | null }) {
  const [brands, setBrands] = React.useState<{ id: number; name: string; category?: { id: number; name: string } | null }[]>([])

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      const res = await fetch('/api/brand')
      const data = await res.json()
      if (mounted) setBrands(data)
    })()
    return () => { mounted = false }
  }, [])

  const filtered = categoryId ? brands.filter((b) => b.category?.id === categoryId) : brands
  return (
    <select value={value ?? ''} onChange={(e) => onChange && onChange(Number(e.target.value))} className="border p-2">
      <option value="">-- Pilih Brand --</option>
      {filtered.map((b) => (
        <option key={b.id} value={b.id}>{b.category ? `${b.category.name} — ${b.name}` : b.name}</option>
      ))}
    </select>
  )
}
