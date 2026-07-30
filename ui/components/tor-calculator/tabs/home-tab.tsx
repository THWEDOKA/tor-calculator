"use client"

import { AlertCircle, Calculator, Database, ExternalLink, Package } from "lucide-react"
import { useEffect, useState } from "react"
import { callDesktop, isDesktop } from "@/lib/desktop-api"

export function HomeTab() {
  const [backendInfo, setBackendInfo] = useState<{ dataDir?: string; dbPath?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!isDesktop()) return
      try {
        const res = await callDesktop<{ ok: boolean; dataDir?: string; dbPath?: string }>("get_app_info")
        if (!cancelled && (res as any).ok) setBackendInfo({ dataDir: (res as any).dataDir, dbPath: (res as any).dbPath })
      } catch {
        // ignore
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="animate-in fade-in duration-300">
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <div className="bg-[var(--tor-bg-card)] rounded-lg p-6 border border-[var(--tor-border-soft)]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#f2f0ec]">Быстрый старт</h2>
                <p className="mt-1 text-sm text-[#9b9b95]">Основные сценарии собраны в двух рабочих разделах.</p>
              </div>
              <div className="rounded-full border border-[var(--tor-border)] px-3 py-1 text-xs text-[#9b9b95]">v0.0.9</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-4">
                <Calculator className="mb-4 h-5 w-5 text-[#d56a72]" />
                <div className="font-medium text-[#f2f0ec]">Сделки</div>
                <p className="mt-1 text-sm leading-5 text-[#9b9b95]">Фиксируйте доходы, расходы и комментарии.</p>
              </div>
              <div className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-4">
                <Package className="mb-4 h-5 w-5 text-[#d56a72]" />
                <div className="font-medium text-[#f2f0ec]">Имущество</div>
                <p className="mt-1 text-sm leading-5 text-[#9b9b95]">Храните предметы, фото, цену покупки и продажу.</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--tor-bg-card)] rounded-lg p-6 border border-[var(--tor-border-soft)]">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-11 h-11 rounded-lg bg-[var(--tor-bg-soft)] flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-[#c84b55]" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#f2f0ec] mb-2">
                  Информация о программе
                </h2>
                <p className="text-[#9b9b95] leading-relaxed">
                  В данный момент программа находится в стадии разработки,
                  возможно возникновение непредвиденных ошибок. В случае найденных
                  багов просьба сообщить на сайт{" "}
                  <a
                    href="https://triazov.ru"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#d56a72] hover:text-[#f2f0ec] inline-flex items-center gap-1"
                  >
                    triazov.ru
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-[var(--tor-bg-card)] rounded-lg p-4 border border-[var(--tor-border-soft)]">
            <div className="text-xl font-semibold text-[#f2f0ec]">v0.0.9</div>
            <div className="text-sm text-[#9b9b95]">Текущая версия</div>
          </div>
          <div className="bg-[var(--tor-bg-card)] rounded-lg p-4 border border-[var(--tor-border-soft)]">
            <div className="text-xl font-semibold text-[#7fb89b]">Стабильно</div>
            <div className="text-sm text-[#9b9b95]">Сохранение данных</div>
          </div>
          <div className="bg-[var(--tor-bg-card)] rounded-lg p-4 border border-[var(--tor-border-soft)]">
            <div className="text-xl font-semibold text-[#f2f0ec]">Desktop</div>
            <div className="text-sm text-[#9b9b95]">Режим приложения</div>
          </div>
          <div className="bg-[var(--tor-bg-card)] rounded-lg p-4 border border-[var(--tor-border-soft)]">
            <Database className="mb-3 h-5 w-5 text-[#767a80]" />
            <div className="text-sm font-medium text-[#f2f0ec]">Локальные данные</div>
            <div className="mt-1 text-sm text-[#9b9b95]">База и резервные копии доступны в настройках.</div>
          </div>
        </div>

        {backendInfo?.dataDir && (
          <div className="lg:col-span-2 text-xs text-[#767a80]">
            <div>Data dir: {backendInfo.dataDir}</div>
            {backendInfo.dbPath && <div>DB: {backendInfo.dbPath}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
