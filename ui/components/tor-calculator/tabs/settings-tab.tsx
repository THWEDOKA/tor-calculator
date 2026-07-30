"use client"

import { useEffect, useState } from "react"
import {
  Download,
  Trash2,
  Database,
  Info,
  ExternalLink,
  AlertTriangle,
  X,
  Palette,
  SlidersHorizontal,
  Volume2,
} from "lucide-react"
import { callDesktop, isDesktop } from "@/lib/desktop-api"
import { SoundSettings } from "@/components/tor-calculator/sound-settings"
import { playActionSound } from "@/lib/sound-settings"
import {
  ACCENT_PRESETS,
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_ACCENT_COLOR,
  applySavedThemeColorsAsync,
  saveAccentColor,
  saveBackgroundColor,
} from "@/lib/accent-color"

interface SettingsTabProps {
  onClearData: () => void
}

type WebTransaction = {
  amount: number
  comment: string
  createdAt: string
}

function loadWebTransactions(): WebTransaction[] {
  const saved = localStorage.getItem("tor-transactions")
  if (!saved) return []
  try {
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    localStorage.removeItem("tor-transactions")
    return []
  }
}

export function SettingsTab({ onClearData }: SettingsTabProps) {
  const [showClearModal, setShowClearModal] = useState(false)
  const [section, setSection] = useState<"general" | "sounds">("general")
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR)
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND_COLOR)

  useEffect(() => {
    void applySavedThemeColorsAsync().then(({ accent, background }) => {
      setAccentColor(accent)
      setBackgroundColor(background)
    })
  }, [])

  const updateAccent = (color: string) => {
    setAccentColor(saveAccentColor(color))
  }

  const updateBackground = (color: string) => {
    setBackgroundColor(saveBackgroundColor(color))
  }

  const handleExportCSV = () => {
    const run = async () => {
      if (isDesktop()) {
        try {
          await callDesktop("export_csv")
          return
        } catch {
          // fallback ниже
        }
      }

    const transactions = loadWebTransactions()
    if (transactions.length === 0) return
    const headers = ["Сумма", "Комментарий", "Дата"]
    const rows = transactions.map((t) => [
      t.amount,
      t.comment,
      new Date(t.createdAt).toLocaleString("ru-RU"),
    ])

    const csv = [headers, ...rows].map((row) => row.join(";")).join("\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tor-calculator-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    }
    void run()
  }

  const handleClearHistory = () => {
    const run = async () => {
      if (isDesktop()) {
        try {
          await callDesktop("transactions_clear")
        } catch {
          // fallback ниже
        }
      }
      localStorage.removeItem("tor-transactions")
      localStorage.removeItem("tor-items")
      onClearData()
      setShowClearModal(false)
      void playActionSound("delete")
    }
    void run()
  }

  const handleBackup = () => {
    const run = async () => {
      if (isDesktop()) {
        try {
          await callDesktop("backup_json")
          return
        } catch {
          // fallback ниже
        }
      }

    const saved = localStorage.getItem("tor-transactions")
    if (!saved) return

    const blob = new Blob([saved], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tor-calculator-backup-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    }
    void run()
  }

  return (
    <div className="animate-in fade-in duration-300">
      <nav
        aria-label="Разделы настроек"
        className="mb-6 inline-flex rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-card)] p-1"
      >
        <button
          type="button"
          onClick={() => setSection("general")}
          aria-current={section === "general" ? "page" : undefined}
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors ${
            section === "general"
              ? "bg-[var(--tor-bg-soft)] text-[#f2f0ec]"
              : "text-[#9b9b95] hover:text-[#f2f0ec]"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Основные
        </button>
        <button
          type="button"
          onClick={() => setSection("sounds")}
          aria-current={section === "sounds" ? "page" : undefined}
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors ${
            section === "sounds"
              ? "bg-[var(--tor-bg-soft)] text-[#f2f0ec]"
              : "text-[#9b9b95] hover:text-[#f2f0ec]"
          }`}
        >
          <Volume2 className="h-4 w-4" />
          Звуки
        </button>
      </nav>

      {section === "sounds" ? (
        <SoundSettings />
      ) : (
      <>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-[var(--tor-bg-card)] rounded-lg p-6 border border-[var(--tor-border-soft)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--tor-bg-soft)] flex items-center justify-center">
                <Database className="w-5 h-5 text-[#7fb89b]" />
              </div>
              <h2 className="text-lg font-semibold text-[#f2f0ec]">Данные</h2>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--tor-bg-input)] rounded-lg text-[#f2f0ec] hover:bg-[var(--tor-bg-soft)] transition-colors"
              >
                <Download className="w-5 h-5 text-[var(--tor-accent)]" />
                Экспорт сделок в CSV
              </button>

              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--tor-bg-input)] rounded-lg text-[var(--tor-accent-strong)] hover:bg-[var(--tor-bg-soft)] transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Очистить историю
              </button>

              <button
                type="button"
                onClick={handleBackup}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--tor-bg-input)] rounded-lg text-[#f2f0ec] hover:bg-[var(--tor-bg-soft)] transition-colors"
              >
                <Database className="w-5 h-5 text-[var(--tor-accent)]" />
                Резервное копирование данных
              </button>
            </div>
          </div>

          <div className="bg-[var(--tor-bg-card)] rounded-lg p-6 border border-[var(--tor-border-soft)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--tor-bg-soft)] flex items-center justify-center">
                <Palette className="w-5 h-5 text-[var(--tor-accent)]" />
              </div>
              <h2 className="text-lg font-semibold text-[#f2f0ec]">Палитра</h2>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {ACCENT_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateAccent(color)}
                  className={`h-10 rounded-lg border transition-transform hover:scale-[1.03] ${
                    accentColor.toLowerCase() === color.toLowerCase()
                      ? "border-[#f2f0ec]"
                      : "border-[var(--tor-border)]"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => updateAccent(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-md border border-[var(--tor-border)] bg-transparent"
                aria-label="Выбрать цвет"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-[#f2f0ec]">Свой цвет</div>
                <div className="text-xs text-[#767a80]">{accentColor.toUpperCase()}</div>
              </div>
              <button
                type="button"
                onClick={() => updateAccent(DEFAULT_ACCENT_COLOR)}
                className="rounded-lg bg-[var(--tor-bg-soft)] px-3 py-2 text-sm text-[#f2f0ec] hover:bg-[var(--tor-bg-control)]"
              >
                Сброс
              </button>
            </div>

            <div className="mt-5 border-t border-[var(--tor-border-soft)] pt-4">
              <div className="mb-3 text-sm font-medium text-[#f2f0ec]">Фон</div>
              <div className="grid grid-cols-6 gap-2">
                {BACKGROUND_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateBackground(color)}
                    className={`h-10 rounded-lg border transition-transform hover:scale-[1.03] ${
                      backgroundColor.toLowerCase() === color.toLowerCase()
                        ? "border-[#f2f0ec]"
                        : "border-[var(--tor-border)]"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-3">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => updateBackground(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-md border border-[var(--tor-border)] bg-transparent"
                  aria-label="Выбрать фон"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-[#f2f0ec]">Свой фон</div>
                  <div className="text-xs text-[#767a80]">{backgroundColor.toUpperCase()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateBackground(DEFAULT_BACKGROUND_COLOR)}
                  className="rounded-lg bg-[var(--tor-bg-soft)] px-3 py-2 text-sm text-[#f2f0ec] hover:bg-[var(--tor-bg-control)]"
                >
                  Сброс
                </button>
              </div>
            </div>
          </div>

        </div>

        <div>
          <div className="bg-[var(--tor-bg-card)] rounded-lg p-6 border border-[var(--tor-border-soft)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--tor-bg-soft)] flex items-center justify-center">
                <Info className="w-5 h-5 text-[var(--tor-accent)]" />
              </div>
              <h2 className="text-lg font-semibold text-[#f2f0ec]">О программе</h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-[var(--tor-border)]">
                <span className="text-[#9b9b95]">Название</span>
                <span className="text-[#f2f0ec] font-medium">TorCalculator</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[var(--tor-border)]">
                <span className="text-[#9b9b95]">Версия</span>
                <span className="text-[#f2f0ec] font-medium">0.0.6</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[var(--tor-border)]">
                <span className="text-[#9b9b95]">Разработчик</span>
                <span className="text-[#f2f0ec] font-medium">triazov</span>
              </div>

              <a
                href="https://t.me/triazovkirill"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--tor-accent)] text-white font-semibold rounded-lg transition-colors duration-200 hover:bg-[var(--tor-accent-hover)] mt-4"
              >
                Телеграм разработчика
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[var(--tor-bg-card)] rounded-lg p-6 max-w-md w-full mx-4 border border-[var(--tor-border-soft)] animate-scale-in">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--tor-bg-soft)] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[var(--tor-accent-strong)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f2f0ec]">Подтверждение</h3>
                <p className="text-[#9b9b95] text-sm">
                  Вы уверены, что хотите удалить всю историю?
                </p>
              </div>
            </div>

            <p className="text-[#9b9b95] mb-6">
              Это действие нельзя отменить. История сделок, предметы в инвентаре и связанные данные будут удалены.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-3 bg-[var(--tor-bg-control)] text-[#f2f0ec] rounded-lg hover:bg-[var(--tor-bg-control-hover)] transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex-1 py-3 bg-[var(--tor-accent)] text-white rounded-lg hover:bg-[var(--tor-accent-hover)] transition-colors"
              >
                Удалить
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowClearModal(false)}
              className="absolute top-4 right-4 p-2 text-[#9b9b95] hover:text-[#f2f0ec] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
