"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { MainWindow } from "./main-window"
import { WindowTitlebar } from "./window-titlebar"
import { WebTopbar } from "./web-topbar"
import { StartupSplash } from "./startup-experience"
import { callDesktop, isDesktop, onDesktopReady } from "@/lib/desktop-api"
import { applySavedThemeColors, applySavedThemeColorsAsync } from "@/lib/accent-color"
import { initializeSoundSettings, installSoundUnlock } from "@/lib/sound-settings"

const CURRENT_VERSION = "0.0.7"
const WHATS_NEW_KEY = `tor-whats-new-seen-${CURRENT_VERSION}`
const MIN_STARTUP_SPLASH_MS = 700
const WhatsNewDialog = dynamic(
  () => import("./whats-new-dialog").then((module) => module.WhatsNewDialog)
)

export function TorCalculatorApp() {
  const [startupProgress, setStartupProgress] = useState(0)
  const [showStartup, setShowStartup] = useState(true)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const [acceptingWhatsNew, setAcceptingWhatsNew] = useState(false)
  const startupBeganAt = useRef<number | null>(null)
  const [mode, setMode] = useState<"detecting" | "desktop" | "web">("detecting")

  useEffect(() => {
    applySavedThemeColors()
    const removeSoundUnlock = installSoundUnlock()
    try {
      const query = new URLSearchParams(window.location.search)
      if (query.get("torcalc_desktop") === "1") setMode("desktop")
    } catch {
      // Desktop API ниже остаётся основным источником режима.
    }
    const loadDesktopMode = () => {
      setMode("desktop")
      void applySavedThemeColorsAsync()
      void initializeSoundSettings()
    }
    const off = onDesktopReady(loadDesktopMode)
    if (isDesktop()) loadDesktopMode()

    const t = setTimeout(() => {
      setMode((m) => (m === "detecting" ? "web" : m))
    }, 350)

    return () => {
      clearTimeout(t)
      off()
      removeSoundUnlock()
    }
  }, [])

  useEffect(() => {
    if (startupBeganAt.current === null) startupBeganAt.current = performance.now()
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - (startupBeganAt.current ?? performance.now())
      setStartupProgress((current) => {
        if (mode === "detecting") {
          return Math.min(88, Math.max(current, Math.floor(elapsed / 8)))
        }
        const readyProgress = Math.floor((elapsed / MIN_STARTUP_SPLASH_MS) * 100)
        return Math.min(100, Math.max(current, readyProgress))
      })
    }, 32)
    return () => window.clearInterval(timer)
  }, [mode])

  useEffect(() => {
    if (startupProgress !== 100) return
    const timer = window.setTimeout(() => setShowStartup(false), 120)
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
        <div className="h-[calc(100%-44px)]">
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
      {showWhatsNew && (
        <WhatsNewDialog
          accepting={acceptingWhatsNew}
          onAccept={() => void acceptWhatsNew()}
        />
      )}
    </div>
  )
}
