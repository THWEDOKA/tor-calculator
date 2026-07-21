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
    <div className="h-11 w-full flex items-stretch select-none border-b border-[var(--tor-border-soft)] bg-[var(--tor-bg-window-soft)] backdrop-blur">
      {/* Drag region: only this left area moves the window */}
      <div className="pywebview-drag-region flex-1 flex items-center gap-3 px-4">
        <BrandLogo className="w-7 h-7" />
        <div className="flex items-center gap-2">
          <div className="text-[#f2f0ec] font-semibold text-sm tracking-tight">TorCalculator</div>
          <div className="rounded-full border border-[var(--tor-accent)]/35 bg-[var(--tor-accent-bg)] px-2.5 py-1 text-xs font-semibold text-[#f2f0ec]/85">
            /promo ETTORE
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#f2f0ec]/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--tor-accent)] shadow-[0_0_12px_var(--tor-accent)]" />
            <span>Лучший впн</span>
            <span className="text-[#f2f0ec]/45">/</span>
            <span className="text-[#f2f0ec]/90">@hamvpn_bot</span>
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <button
          type="button"
          onClick={minimize}
          disabled={!canControl}
          className="h-11 w-12 flex items-center justify-center text-[#8f949b] hover:text-[#f2f0ec] hover:bg-[var(--tor-bg-soft)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Свернуть"
          title="Свернуть"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={close}
          disabled={!canControl}
          className="h-11 w-12 flex items-center justify-center text-[#8f949b] hover:text-white hover:bg-[var(--tor-accent)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Закрыть"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

