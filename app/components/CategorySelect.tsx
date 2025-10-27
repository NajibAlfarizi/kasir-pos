"use client"

import * as React from "react"

export default function CategorySelect({ value, onChange }: { value?: number | null; onChange?: (v: number) => void }) {
  const [categories, setCategories] = React.useState<{ id: number; name: string }[]>([])

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      const res = await fetch('/api/kategori')
      const data = await res.json()
      if (mounted) setCategories(data)
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <select value={value ?? ''} onChange={(e) => onChange && onChange(Number(e.target.value))} className="border p-2">
      <option value="">-- Pilih Kategori --</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
        </select>
      )
    }