"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Keyboard, LoaderCircle, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { callDesktop, isDesktop, onDesktopReady } from "@/lib/desktop-api"

type HotkeyKey =
  | "backslash"
  | "f1"
  | "f2"
  | "f3"
  | "f4"
  | "f5"
  | "f6"
  | "f7"
  | "f8"
  | "f9"
  | "f10"
  | "f11"
  | "f12"
  | "insert"
  | "home"
  | "end"
  | "page-up"
  | "page-down"
  | "pause"
  | "scroll-lock"

type HotkeyResponse = {
  ok: boolean
  key?: HotkeyKey
  pressCount?: number
  supported?: boolean
  running?: boolean
}

const DEFAULT_KEY: HotkeyKey = "backslash"
const DEFAULT_PRESS_COUNT = 2
const PRESS_COUNTS = [1, 2, 3, 4, 5]
const KEY_OPTIONS: { value: HotkeyKey; label: string; badge: string }[] = [
  { value: "backslash", label: "\\ — клавиша над Enter", badge: "\\" },
  ...Array.from({ length: 12 }, (_, index) => {
    const number = index + 1
    return {
      value: `f${number}` as HotkeyKey,
      label: `F${number}`,
      badge: `F${number}`,
    }
  }),
  { value: "insert", label: "Insert", badge: "Ins" },
  { value: "home", label: "Home", badge: "Home" },
  { value: "end", label: "End", badge: "End" },
  { value: "page-up", label: "Page Up", badge: "PgUp" },
  { value: "page-down", label: "Page Down", badge: "PgDn" },
  { value: "pause", label: "Pause", badge: "Pause" },
  { value: "scroll-lock", label: "Scroll Lock", badge: "ScrLk" },
]

function keyBadge(key: HotkeyKey) {
  return KEY_OPTIONS.find((option) => option.value === key)?.badge ?? "\\"
}

function pressLabel(count: number) {
  if (count === 1) return "1 раз"
  if (count >= 2 && count <= 4) return `${count} раза`
  return `${count} раз`
}

export function GlobalHotkeySettings() {
  const [key, setKey] = useState<HotkeyKey>(DEFAULT_KEY)
  const [pressCount, setPressCount] = useState(DEFAULT_PRESS_COUNT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [supported, setSupported] = useState(true)
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    if (!isDesktop()) {
      setSupported(false)
      setRunning(false)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await callDesktop<HotkeyResponse>("hotkey_settings_get")
      if (result.ok) {
        setKey(result.key ?? DEFAULT_KEY)
        setPressCount(result.pressCount ?? DEFAULT_PRESS_COUNT)
        setSupported(result.supported !== false)
        setRunning(result.running === true)
      }
    } catch {
      setSupported(false)
      setRunning(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    return onDesktopReady(() => {
      void load()
    })
  }, [load])

  const persist = async (nextKey: HotkeyKey, nextCount: number) => {
    if (!isDesktop()) return
    setSaving(true)
    setSaved(false)
    try {
      const result = await callDesktop<HotkeyResponse>(
        "hotkey_settings_set",
        nextKey,
        nextCount
      )
      setRunning(result.ok && result.running === true)
      setSaved(result.ok)
      if (result.ok) window.setTimeout(() => setSaved(false), 1500)
    } catch {
      setRunning(false)
      setSaved(false)
    } finally {
      setSaving(false)
    }
  }

  const chooseKey = (value: HotkeyKey) => {
    setKey(value)
    void persist(value, pressCount)
  }

  const choosePressCount = (value: string) => {
    const nextCount = Number(value)
    setPressCount(nextCount)
    void persist(key, nextCount)
  }

  const reset = () => {
    setKey(DEFAULT_KEY)
    setPressCount(DEFAULT_PRESS_COUNT)
    void persist(DEFAULT_KEY, DEFAULT_PRESS_COUNT)
  }

  const testRaise = () => {
    if (!isDesktop()) return
    void callDesktop("window_raise")
  }

  return (
    <section className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-card)] p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--tor-bg-soft)]">
            <Keyboard className="h-5 w-5 text-[var(--tor-accent)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#f2f0ec]">Быстрый вызов</h2>
            <p className="mt-0.5 text-sm text-[#9b9b95]">
              Поднимает приложение поверх других окон
            </p>
          </div>
        </div>
        <div
          className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium ${
            supported && running
              ? "border-[#7fb89b]/30 bg-[#7fb89b]/10 text-[#8bc6a7]"
              : "border-[var(--tor-border)] bg-[var(--tor-bg-input)] text-[#9b9b95]"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${supported && running ? "bg-[#7fb89b]" : "bg-[#767a80]"}`} />
          {loading ? "Проверка..." : supported && running ? "Активно" : "Только Windows"}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-5 rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#767a80]">
            Текущий вызов
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-[#9b9b95]">
            Нажмите клавишу
            <kbd className="inline-flex min-h-8 min-w-10 items-center justify-center rounded-md border border-[var(--tor-border-strong)] bg-[var(--tor-bg-card)] px-2.5 font-mono text-sm font-semibold text-[#f2f0ec]">
              {keyBadge(key)}
            </kbd>
            <span className="text-[#767a80]">×</span>
            <span className="font-semibold tabular-nums text-[#f2f0ec]">{pressCount}</span>
          </div>
        </div>
        <Sparkles className="h-5 w-5 shrink-0 text-[var(--tor-accent-strong)]" />
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#9b9b95]">
            Клавиша
          </label>
          <Select
            value={key}
            onValueChange={(value) => chooseKey(value as HotkeyKey)}
            disabled={loading || !supported}
          >
            <SelectTrigger
              aria-label="Клавиша быстрого вызова"
              className="h-11 border-[var(--tor-border)] bg-[var(--tor-bg-input)] text-[#f2f0ec]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[var(--tor-border)] bg-[var(--tor-bg-card)] text-[#f2f0ec]">
              {KEY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#9b9b95]">
            Количество нажатий
          </label>
          <Select
            value={String(pressCount)}
            onValueChange={choosePressCount}
            disabled={loading || !supported}
          >
            <SelectTrigger
              aria-label="Количество нажатий"
              className="h-11 border-[var(--tor-border)] bg-[var(--tor-bg-input)] text-[#f2f0ec]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[var(--tor-border)] bg-[var(--tor-bg-card)] text-[#f2f0ec]">
              {PRESS_COUNTS.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {pressLabel(count)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#767a80]">
        Последовательные нажатия учитываются с паузой не более 650 мс. Клавиша продолжает
        работать в игре или другой программе как обычно.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tor-border-soft)] pt-4">
        <div className="inline-flex min-h-10 items-center gap-2 text-xs text-[#9b9b95]">
          {saving ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Сохраняю...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4 text-[#7fb89b]" />
              Настройка сохранена
            </>
          ) : (
            "Изменения применяются сразу"
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={reset}
            disabled={loading || saving || !supported}
            className="h-10 bg-[var(--tor-bg-control)] text-[#f2f0ec]"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            По умолчанию
          </Button>
          <Button
            type="button"
            onClick={testRaise}
            disabled={loading || !supported}
            className="h-10 bg-[var(--tor-accent)] text-white hover:bg-[var(--tor-accent-hover)]"
          >
            Проверить
          </Button>
        </div>
      </div>
    </section>
  )
}
