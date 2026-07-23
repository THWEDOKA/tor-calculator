"use client"

import { useEffect, useRef, useState } from "react"
import { MainWindow } from "./main-window"
import { WindowTitlebar } from "./window-titlebar"
import { WebTopbar } from "./web-topbar"
import { StartupSplash, WhatsNewDialog } from "./startup-experience"
import { callDesktop, isDesktop, onDesktopReady } from "@/lib/desktop-api"
import { applySavedThemeColors, applySavedThemeColorsAsync } from "@/lib/accent-color"

const CURRENT_VERSION = "0.0.4"
const WHATS_NEW_KEY = `tor-whats-new-seen-${CURRENT_VERSION}`

export function TorCalculatorApp() {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [startupProgress, setStartupProgress] = useState(0)
  const [showStartup, setShowStartup] = useState(true)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const [acceptingWhatsNew, setAcceptingWhatsNew] = useState(false)
  const startupBeganAt = useRef<number | null>(null)
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
    if (startupBeganAt.current === null) startupBeganAt.current = performance.now()
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - (startupBeganAt.current ?? performance.now())
      setStartupProgress((current) => {
        if (mode === "detecting") {
          return Math.min(88, Math.max(current + 1, Math.floor(elapsed / 15)))
        }
        if (elapsed < 1200) return Math.min(96, current + 3)
        return Math.min(100, current + 4)
      })
    }, 48)
    return () => window.clearInterval(timer)
  }, [mode])

  useEffect(() => {
    if (startupProgress !== 100) return
    const timer = window.setTimeout(() => setShowStartup(false), 240)
    return () => window.clearTimeout(timer)
  }, [startupProgress])

  useEffect(() => {
    if (mode !== "desktop") return
    document.body.classList.add("tor-desktop")
    return () => document.body.classList.remove("tor-desktop")
  }, [mode])

  useEffect(() => {
    if (showStartup || mode === "detecting") return
    let cancelled = false

    const check = async () => {
      if (localStorage.getItem(WHATS_NEW_KEY) === "1") return
      if (mode === "desktop") {
        try {
          const result = await callDesktop<{ ok: boolean; value?: string | null }>(
            "setting_get",
            WHATS_NEW_KEY
          )
          if (result.ok && result.value === "1") {
            localStorage.setItem(WHATS_NEW_KEY, "1")
            return
          }
        } catch {
          // Покажем окно и сохраним локально, если desktop API временно недоступен.
        }
      }
      if (!cancelled) setShowWhatsNew(true)
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [mode, showStartup])

  const acceptWhatsNew = async () => {
    setAcceptingWhatsNew(true)
    localStorage.setItem(WHATS_NEW_KEY, "1")
    if (mode === "desktop") {
      try {
        await callDesktop("setting_set", WHATS_NEW_KEY, "1")
      } catch {
        // localStorage остаётся резервным постоянным маркером.
      }
    }
    setShowWhatsNew(false)
    setAcceptingWhatsNew(false)
  }

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
      {showStartup && <StartupSplash progress={startupProgress} />}
      <WhatsNewDialog
        open={showWhatsNew}
        accepting={acceptingWhatsNew}
        onAccept={() => void acceptWhatsNew()}
      />
    </div>
  )
}
