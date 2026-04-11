"use client"

import { BrandLogo } from "./brand-logo"

export function WebTopbar() {
  return (
    <div className="h-11 w-full flex items-center select-none border-b border-[#2a2a2a] bg-[#0e0e0e]/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4">
        <BrandLogo className="w-7 h-7" />
        <div className="text-[#f5f5f5] font-semibold text-sm">TorCalculator</div>
        <div className="ml-2 text-xs text-[#737373]">Личный кабинет</div>
      </div>
    </div>
  )
}

