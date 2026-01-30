"use client"

import { Minus, X } from "lucide-react"
import { callDesktop, isDesktop } from "@/lib/desktop-api"

export function WindowTitlebar() {
  const canControl = isDesktop()

  const minimize = async () => {
    if (!canControl) return
    try {
      await callDesktop("window_minimize")
    } catch {
      // ignore
    }
  }

  const close = async () => {
    if (!canControl) return
    try {
      await callDesktop("window_close")
    } catch {
      // ignore
    }
  }

  return (
    <div className="h-11 w-full flex items-stretch select-none border-b border-[#334155] bg-[#0f172a]/95 backdrop-blur">
      {/* Drag region: only this left area moves the window */}
      <div className="pywebview-drag-region flex-1 flex items-center gap-3 px-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
          <span className="text-white font-bold text-sm">T</span>
        </div>
        <div className="text-[#f8fafc] font-semibold text-sm">TorCalculator</div>
      </div>

      <div className="flex items-center">
        <button
          type="button"
          onClick={minimize}
          disabled={!canControl}
          className="h-11 w-12 flex items-center justify-center text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]/40 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Свернуть"
          title="Свернуть"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={close}
          disabled={!canControl}
          className="h-11 w-12 flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-red-500/80 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Закрыть"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

