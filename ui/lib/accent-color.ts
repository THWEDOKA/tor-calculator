import { callDesktop, isDesktop } from "@/lib/desktop-api"

export const LS_ACCENT_COLOR = "tor-accent-color"
export const LS_BACKGROUND_COLOR = "tor-background-color"
export const SETTING_ACCENT_COLOR = "accent-color"
export const SETTING_BACKGROUND_COLOR = "background-color"
export const DEFAULT_ACCENT_COLOR = "#c84b55"
export const DEFAULT_BACKGROUND_COLOR = "#101113"

export const ACCENT_PRESETS = [
  "#c84b55",
  "#e05b70",
  "#d97706",
  "#7fb89b",
  "#3b82f6",
  "#8b5cf6",
]

export const BACKGROUND_PRESETS = [
  "#101113",
  "#0b0f14",
  "#111827",
  "#15131a",
  "#14110f",
  "#0f1512",
]

function normalizeHex(value: string, fallback = DEFAULT_ACCENT_COLOR) {
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed
  return fallback
}

function hexToRgb(hex: string, fallback = DEFAULT_ACCENT_COLOR) {
  const clean = normalizeHex(hex, fallback).slice(1)
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function mix(hex: string, target: "white" | "black", amount: number) {
  const { r, g, b } = hexToRgb(hex)
  const t = target === "white" ? 255 : 0
  const next = (channel: number) => Math.round(channel + (t - channel) * amount)
  return `#${[next(r), next(g), next(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`
}

export function applyAccentColor(value: string) {
  if (typeof document === "undefined") return DEFAULT_ACCENT_COLOR
  const color = normalizeHex(value, DEFAULT_ACCENT_COLOR)
  const { r, g, b } = hexToRgb(color)
  const root = document.documentElement
  root.style.setProperty("--tor-accent", color)
  root.style.setProperty("--tor-accent-strong", mix(color, "white", 0.14))
  root.style.setProperty("--tor-accent-hover", mix(color, "white", 0.08))
  root.style.setProperty("--tor-accent-dark", mix(color, "black", 0.5))
  root.style.setProperty("--tor-accent-bg", `rgba(${r}, ${g}, ${b}, 0.16)`)
  root.style.setProperty("--tor-accent-bg-strong", `rgba(${r}, ${g}, ${b}, 0.26)`)
  return color
}

export function loadAccentColor() {
  if (typeof window === "undefined") return DEFAULT_ACCENT_COLOR
  return normalizeHex(localStorage.getItem(LS_ACCENT_COLOR) || DEFAULT_ACCENT_COLOR, DEFAULT_ACCENT_COLOR)
}

export function saveAccentColor(value: string) {
  const color = applyAccentColor(value)
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_ACCENT_COLOR, color)
    if (isDesktop()) {
      void callDesktop("setting_set", SETTING_ACCENT_COLOR, color).catch(() => {})
    }
  }
  return color
}

export async function loadAccentColorAsync() {
  if (typeof window === "undefined") return DEFAULT_ACCENT_COLOR
  if (isDesktop()) {
    try {
      const res = await callDesktop<{ ok: boolean; value?: string | null }>("setting_get", SETTING_ACCENT_COLOR)
      if ((res as any).ok && (res as any).value) {
        const color = normalizeHex((res as any).value, DEFAULT_ACCENT_COLOR)
        localStorage.setItem(LS_ACCENT_COLOR, color)
        return color
      }
      const local = loadAccentColor()
      await callDesktop("setting_set", SETTING_ACCENT_COLOR, local)
      return local
    } catch {
      // fallback ниже
    }
  }
  return loadAccentColor()
}

export function applySavedAccentColor() {
  return applyAccentColor(loadAccentColor())
}

export function applyBackgroundColor(value: string) {
  if (typeof document === "undefined") return DEFAULT_BACKGROUND_COLOR
  const color = normalizeHex(value, DEFAULT_BACKGROUND_COLOR)
  const root = document.documentElement
  const card = mix(color, "white", 0.05)
  const input = mix(color, "black", 0.08)
  const soft = mix(color, "white", 0.1)
  const control = mix(color, "white", 0.14)
  const controlHover = mix(color, "white", 0.19)
  const border = mix(color, "white", 0.16)
  const borderSoft = mix(color, "white", 0.11)
  const borderStrong = mix(color, "white", 0.25)

  root.style.setProperty("--tor-bg-dark", color)
  root.style.setProperty("--tor-bg-window", color)
  root.style.setProperty("--tor-bg-window-soft", mix(color, "white", 0.03))
  root.style.setProperty("--tor-bg-card", card)
  root.style.setProperty("--tor-bg-input", input)
  root.style.setProperty("--tor-bg-soft", soft)
  root.style.setProperty("--tor-bg-control", control)
  root.style.setProperty("--tor-bg-control-hover", controlHover)
  root.style.setProperty("--tor-border", border)
  root.style.setProperty("--tor-border-soft", borderSoft)
  root.style.setProperty("--tor-border-strong", borderStrong)
  root.style.setProperty("--background", color)
  root.style.setProperty("--card", card)
  root.style.setProperty("--popover", card)
  root.style.setProperty("--secondary", control)
  root.style.setProperty("--muted", control)
  root.style.setProperty("--border", border)
  root.style.setProperty("--input", border)
  document.body.style.backgroundColor = color
  return color
}

export function loadBackgroundColor() {
  if (typeof window === "undefined") return DEFAULT_BACKGROUND_COLOR
  return normalizeHex(localStorage.getItem(LS_BACKGROUND_COLOR) || DEFAULT_BACKGROUND_COLOR, DEFAULT_BACKGROUND_COLOR)
}

export function saveBackgroundColor(value: string) {
  const color = applyBackgroundColor(value)
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_BACKGROUND_COLOR, color)
    if (isDesktop()) {
      void callDesktop("setting_set", SETTING_BACKGROUND_COLOR, color).catch(() => {})
    }
  }
  return color
}

export async function loadBackgroundColorAsync() {
  if (typeof window === "undefined") return DEFAULT_BACKGROUND_COLOR
  if (isDesktop()) {
    try {
      const res = await callDesktop<{ ok: boolean; value?: string | null }>("setting_get", SETTING_BACKGROUND_COLOR)
      if ((res as any).ok && (res as any).value) {
        const color = normalizeHex((res as any).value, DEFAULT_BACKGROUND_COLOR)
        localStorage.setItem(LS_BACKGROUND_COLOR, color)
        return color
      }
      const local = loadBackgroundColor()
      await callDesktop("setting_set", SETTING_BACKGROUND_COLOR, local)
      return local
    } catch {
      // fallback ниже
    }
  }
  return loadBackgroundColor()
}

export function applySavedThemeColors() {
  applySavedAccentColor()
  return applyBackgroundColor(loadBackgroundColor())
}

export async function applySavedThemeColorsAsync() {
  const [accent, background] = await Promise.all([
    loadAccentColorAsync(),
    loadBackgroundColorAsync(),
  ])
  applyAccentColor(accent)
  applyBackgroundColor(background)
  return { accent, background }
}
