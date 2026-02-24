"use client"

export function WebTopbar() {
  return (
    <div className="h-11 w-full flex items-center select-none border-b border-[#334155] bg-[#0f172a]/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
          <span className="text-white font-bold text-sm">T</span>
        </div>
        <div className="text-[#f8fafc] font-semibold text-sm">TorCalculator</div>
        <div className="ml-2 text-xs text-[#64748b]">Личный кабинет</div>
      </div>
    </div>
  )
}

