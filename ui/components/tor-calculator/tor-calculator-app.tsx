"use client"

import { useEffect, useState } from "react"
import { MainWindow } from "./main-window"
import { WindowTitlebar } from "./window-titlebar"
import { WebTopbar } from "./web-topbar"
import { isDesktop, onDesktopReady } from "@/lib/desktop-api"
import { applySavedThemeColors, applySavedThemeColorsAsync } from "@/lib/accent-color"

export function TorCalculatorApp() {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [mode, setMode] = useState<"detecting" | "desktop" | "web">(() => {
    if (typeof window === "undefined") return "detecting"
    try {
      const q = new URLSearchParams(window.location.search)
      if (q.get("torcalc_desktop") === "1") return "desktop"
    } catch {
    }
    return "detecting"
  })

  useEffect(() => {
    applySavedThemeColors()
    const loadDesktopMode = () => {
      setMode("desktop")
      void applySavedThemeColorsAsync()
    }
    const off = onDesktopReady(loadDesktopMode)
    if (isDesktop()) loadDesktopMode()

    const t = setTimeout(() => {
      setMode((m) => (m === "detecting" ? "web" : m))
    }, 350)

    return () => {
      clearTimeout(t)
      off()
    }
  }, [])

  useEffect(() => {
    if (mode !== "desktop") return
    document.body.classList.add("tor-desktop")
    return () => document.body.classList.remove("tor-desktop")
  }, [mode])

  return (
    <div className="h-screen w-screen bg-[var(--tor-bg-dark)]">
      <div className="h-full w-full overflow-hidden bg-[var(--tor-bg-dark)] border border-[var(--tor-border-soft)]">
        {mode === "desktop" ? <WindowTitlebar /> : <WebTopbar />}
        <div className={`${isTransitioning ? "opacity-0" : "opacity-100"} transition-opacity duration-300 h-[calc(100%-44px)]`}>
          {mode === "detecting" ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-9 h-9 mx-auto rounded-full border-2 border-[var(--tor-border)] border-t-[var(--tor-accent)] animate-spin" />
                <div className="mt-3 text-sm text-[#9b9b95]">Загрузка...</div>
              </div>
            </div>
          ) : (
            <MainWindow />
          )}
        </div>
      </div>
    </div>
  )
}
