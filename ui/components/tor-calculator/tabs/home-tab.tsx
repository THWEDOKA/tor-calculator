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
        <h1 className="text-3xl font-bold text-[#f5f5f5] mb-4">
          Добро пожаловать в TorCalculator
        </h1>
        
        <div className="bg-[#161616] rounded-xl p-6 border border-[#2a2a2a]">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-[#e81c5a]/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-[#e81c5a]" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#f5f5f5] mb-2">
                Информация о программе
              </h2>
              <p className="text-[#a3a3a3] leading-relaxed">
                В данный момент программа находится в стадии разработки, 
                возможно возникновение непредвиденных ошибок. В случае найденных 
                багов просьба сообщить на сайт{" "}
                <a
                  href="https://triazov.ru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#e81c5a] hover:underline inline-flex items-center gap-1"
                >
                  triazov.ru
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-r from-[#e81c5a]/12 to-[#e81c5a]/5 rounded-xl p-6 border border-[#e81c5a]/25">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-[#e81c5a]/20 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-[#e81c5a]" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#f5f5f5] mb-2">
                Начните работу
              </h2>
              <p className="text-[#a3a3a3]">
                Для подсчёта заработка откройте{" "}
                <span className="text-[#e81c5a] font-medium">«Калькулятор»</span>, а предметы с фото и продажей — в{" "}
                <span className="text-[#e81c5a] font-medium">«Предметы»</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-[#161616] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-2xl font-bold text-[#e81c5a]">v0.0.2</div>
            <div className="text-sm text-[#a3a3a3]">Текущая версия</div>
          </div>
          <div className="bg-[#161616] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-2xl font-bold text-[#10b981]">Стабильно</div>
            <div className="text-sm text-[#a3a3a3]">Сохранение данных</div>
          </div>
          <div className="bg-[#161616] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-2xl font-bold text-[#e81c5a]">Desktop</div>
            <div className="text-sm text-[#a3a3a3]">Режим приложения</div>
          </div>
        </div>

        {backendInfo?.dataDir && (
          <div className="mt-4 text-xs text-[#737373]">
            <div>Data dir: {backendInfo.dataDir}</div>
            {backendInfo.dbPath && <div>DB: {backendInfo.dbPath}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
