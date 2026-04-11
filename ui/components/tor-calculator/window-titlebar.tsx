"use client"

import { Minus, X } from "lucide-react"
import { callDesktop, isDesktop, onDesktopReady } from "@/lib/desktop-api"
import { useEffect, useState } from "react"
import { BrandLogo } from "./brand-logo"

export function WindowTitlebar() {
  const [canControl, setCanControl] = useState(false)

  useEffect(() => {
    setCanControl(isDesktop())
    return onDesktopReady(() => setCanControl(true))
  }, [])

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
    <div className="h-11 w-full flex items-stretch select-none border-b border-[#2a2a2a] bg-[#0e0e0e]/95 backdrop-blur">
      {/* Drag region: only this left area moves the window */}
      <div className="pywebview-drag-region flex-1 flex items-center gap-3 px-4">
        <BrandLogo className="w-7 h-7" />
        <div className="text-[#f5f5f5] font-semibold text-sm">TorCalculator</div>
      </div>

      <div className="flex items-center">
        <button
          type="button"
          onClick={minimize}
          disabled={!canControl}
          className="h-11 w-12 flex items-center justify-center text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#2a2a2a]/60 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Свернуть"
          title="Свернуть"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={close}
          disabled={!canControl}
          className="h-11 w-12 flex items-center justify-center text-[#a3a3a3] hover:text-white hover:bg-red-500/80 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Закрыть"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

