"use client"

import { Calculator, Package, Settings, Target } from "lucide-react"

type TabType = "calculator" | "goal" | "items" | "settings"

interface SidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const menuItems: { id: TabType; label: string; icon: typeof Calculator }[] = [
    { id: "calculator", label: "Сделки", icon: Calculator },
    { id: "items", label: "Имущество", icon: Package },
    { id: "goal", label: "Цель", icon: Target },
    { id: "settings", label: "Настройки", icon: Settings },
  ]

  return (
    <nav className="flex min-h-12 flex-wrap items-stretch gap-1">
      {menuItems.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            title={item.label}
            className={`flex h-12 items-center justify-center px-4 text-sm font-medium transition-colors ${
              isActive
                ? "text-[#f2f0ec]"
                : "text-[#9b9b95] hover:text-[#f2f0ec]"
            }`}
          >
            <span className="relative flex h-full items-center gap-2">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
              <span
                className={`absolute bottom-0 left-0 h-0.5 rounded-full bg-[var(--tor-accent)] transition-all duration-200 ${
                  isActive ? "w-full opacity-100" : "w-0 opacity-0"
                }`}
              />
            </span>
          </button>
        )
      })}
    </nav>
  )
}
