"use client"

import * as React from "react"
import { PrintCheck } from './print-check'
import { Clock } from 'lucide-react'

export function NavBar() {
  const [dateTime, setDateTime] = React.useState<string>("");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
      };
      setDateTime(now.toLocaleString("id-ID", options));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <nav className="w-full h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-xs px-6 lg:px-8 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-sm font-semibold text-slate-800">KasirQu Point of Sale</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {mounted && dateTime && (
          <div suppressHydrationWarning className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/70">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span suppressHydrationWarning>{dateTime}</span>
          </div>
        )}
        <PrintCheck />
      </div>
    </nav>
  );
}
