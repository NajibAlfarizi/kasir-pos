"use client"

import * as React from "react"

export default function BrandSelect({ value, onChange }: { value?: number | null; onChange?: (v: number) => void }) {
  const [brands, setBrands] = React.useState<{ id: number; name: string }[]>([])

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      const res = await fetch('/api/brand')
      const data = await res.json()
      if (mounted) setBrands(data)
    })()
    return () => { mounted = false }
  }, [])

  return (
    <select value={value ?? ''} onChange={(e) => onChange && onChange(Number(e.target.value))} className="border p-2">
      <option value="">-- Pilih Brand --</option>
      {brands.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  )
}
