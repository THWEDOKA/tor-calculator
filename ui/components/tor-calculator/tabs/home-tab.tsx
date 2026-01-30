"use client"

import { AlertCircle, Calculator, ExternalLink } from "lucide-react"
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
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-[#f8fafc] mb-4">
          Добро пожаловать в TorCalculator
        </h1>
        
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-[#3b82f6]" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#f8fafc] mb-2">
                Информация о программе
              </h2>
              <p className="text-[#94a3b8] leading-relaxed">
                В данный момент программа находится в стадии разработки, 
                возможно возникновение непредвиденных ошибок. В случае найденных 
                багов просьба сообщить на сайт{" "}
                <a
                  href="https://triazov.ru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3b82f6] hover:underline inline-flex items-center gap-1"
                >
                  triazov.ru
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 rounded-xl p-6 border border-[#3b82f6]/20">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-[#3b82f6]" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#f8fafc] mb-2">
                Начните работу
              </h2>
              <p className="text-[#94a3b8]">
                Для начала подсчета заработка выберите в меню слева раздел{" "}
                <span className="text-[#3b82f6] font-medium">{'"'}Калькулятор{'"'}</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <div className="text-2xl font-bold text-[#3b82f6]">v0.0.1</div>
            <div className="text-sm text-[#94a3b8]">Текущая версия</div>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <div className="text-2xl font-bold text-[#10b981]">Стабильно</div>
            <div className="text-sm text-[#94a3b8]">Сохранение данных</div>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <div className="text-2xl font-bold text-[#8b5cf6]">Desktop</div>
            <div className="text-sm text-[#94a3b8]">Режим приложения</div>
          </div>
        </div>

        {backendInfo?.dataDir && (
          <div className="mt-4 text-xs text-[#64748b]">
            <div>Data dir: {backendInfo.dataDir}</div>
            {backendInfo.dbPath && <div>DB: {backendInfo.dbPath}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
