"use client"

import { BrandLogo } from "./brand-logo"

export function WebTopbar() {
  return (
    <div className="h-11 w-full flex items-center select-none border-b border-[var(--tor-border-soft)] bg-[var(--tor-bg-window-soft)] backdrop-blur">
      <div className="flex items-center gap-3 px-4">
        <BrandLogo className="w-7 h-7" />
        <div className="text-[#f2f0ec] font-semibold text-sm tracking-tight">TorCalculator</div>
        <div className="ml-2 text-xs text-[#767a80]">Личный кабинет</div>
      </div>
    </div>
  )
}

