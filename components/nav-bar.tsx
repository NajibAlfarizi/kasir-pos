"use client"

import * as React from "react"
import { PrintCheck } from './print-check'

export function NavBar() {
  const [dateTime, setDateTime] = React.useState<string>("");

  React.useEffect(() => {
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
    <nav className="w-full h-16 border-b bg-white px-8 flex items-center">
      {/* Left spacer for alignment with sidebar */}
      <div className="flex-1" />
      {/* Center content */}
      <div className="flex-1 flex justify-center items-center">
        <span className="text-lg text-gray-700 font-semibold">Selamat datang di KasirQu</span>
      </div>
      {/* Right: Date and Time + Print Check */}
      <div className="flex-1 flex justify-end items-center gap-4">
        <span className="font-semibold text-gray-700 text-right block whitespace-nowrap text-base">{dateTime}</span>
        <PrintCheck />
      </div>
    </nav>
  );
}
