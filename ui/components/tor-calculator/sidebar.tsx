"use client"

import { Home, Calculator, Package, Settings } from "lucide-react"
import { BrandLogo } from "./brand-logo"

type TabType = "home" | "calculator" | "items" | "settings"

interface SidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const menuItems: { id: TabType; label: string; icon: typeof Home }[] = [
    { id: "home", label: "Главная", icon: Home },
    { id: "calculator", label: "Калькулятор", icon: Calculator },
    { id: "items", label: "Имущество", icon: Package },
    { id: "settings", label: "Настройки", icon: Settings },
  ]

  return (
    <div className="w-64 h-full bg-[#161616] flex flex-col border-r border-[#2a2a2a]">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <BrandLogo className="w-10 h-10" />
          <div>
            <h1 className="text-[#f5f5f5] font-bold text-lg">TorCalculator</h1>
            <span className="text-[#737373] text-xs">Версия: 0.0.2</span>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="h-px bg-[#2a2a2a]" />
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-[#e81c5a]/15 text-[#e81c5a]"
                  : "text-[#a3a3a3] hover:bg-[#2a2a2a]/80 hover:text-[#f5f5f5]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#e81c5a]" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
