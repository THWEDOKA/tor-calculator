"use client"

import { useState } from "react"
import {
  Download,
  Trash2,
  Database,
  Info,
  ExternalLink,
  AlertTriangle,
  X,
} from "lucide-react"
import { callDesktop, isDesktop } from "@/lib/desktop-api"

interface SettingsTabProps {
  onClearData: () => void
}

export function SettingsTab({ onClearData }: SettingsTabProps) {
  const [showClearModal, setShowClearModal] = useState(false)

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

    const saved = localStorage.getItem("tor-transactions")
    if (!saved) return

    const transactions = JSON.parse(saved)
    const headers = ["Сумма", "Комментарий", "Дата"]
    const rows = transactions.map((t: { amount: number; comment: string; createdAt: string }) => [
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
      onClearData()
      setShowClearModal(false)
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
      <h1 className="text-2xl font-bold text-[#f8fafc] mb-6">Настройки</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-[#10b981]" />
              </div>
              <h2 className="text-lg font-semibold text-[#f8fafc]">Данные</h2>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#0f172a] rounded-lg text-[#f8fafc] hover:bg-[#0f172a]/70 transition-colors"
              >
                <Download className="w-5 h-5 text-[#3b82f6]" />
                Экспорт сделок в CSV
              </button>

              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Очистить историю
              </button>

              <button
                type="button"
                onClick={handleBackup}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#0f172a] rounded-lg text-[#f8fafc] hover:bg-[#0f172a]/70 transition-colors"
              >
                <Database className="w-5 h-5 text-[#8b5cf6]" />
                Резервное копирование данных
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#8b5cf6]/20 flex items-center justify-center">
                <Info className="w-5 h-5 text-[#8b5cf6]" />
              </div>
              <h2 className="text-lg font-semibold text-[#f8fafc]">О программе</h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-[#334155]">
                <span className="text-[#94a3b8]">Название</span>
                <span className="text-[#f8fafc] font-medium">TorCalculator</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[#334155]">
                <span className="text-[#94a3b8]">Версия</span>
                <span className="text-[#f8fafc] font-medium">0.0.1</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[#334155]">
                <span className="text-[#94a3b8]">Разработчик</span>
                <span className="text-[#f8fafc] font-medium">triazov</span>
              </div>

              <a
                href="https://triazov.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-[#3b82f6]/25 hover:-translate-y-0.5 mt-4"
              >
                Сайт разработчика
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#1e293b] rounded-xl p-6 max-w-md w-full mx-4 border border-[#334155] animate-scale-in">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f8fafc]">Подтверждение</h3>
                <p className="text-[#94a3b8] text-sm">
                  Вы уверены, что хотите удалить всю историю?
                </p>
              </div>
            </div>

            <p className="text-[#94a3b8] mb-6">
              Это действие нельзя отменить. Все записи о сделках будут безвозвратно удалены.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-3 bg-[#334155] text-[#f8fafc] rounded-lg hover:bg-[#475569] transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Удалить
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowClearModal(false)}
              className="absolute top-4 right-4 p-2 text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
