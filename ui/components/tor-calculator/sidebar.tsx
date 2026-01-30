"use client"

import { Home, Calculator, Settings, LogOut } from "lucide-react"

type TabType = "home" | "calculator" | "settings"

interface SidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  user: { username: string; status: string }
  onLogout: () => void
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  user: { bg: "bg-[#64748b]", text: "text-[#64748b]", label: "User" },
  media: { bg: "bg-[#3b82f6]", text: "text-[#3b82f6]", label: "Media" },
  developer: { bg: "bg-gradient-to-r from-[#f59e0b] to-[#f97316]", text: "text-[#f59e0b]", label: "Developer" },
}

const menuItems: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Главная", icon: Home },
  { id: "calculator", label: "Калькулятор", icon: Calculator },
  { id: "settings", label: "Настройки", icon: Settings },
]

export function Sidebar({ activeTab, onTabChange, user, onLogout }: SidebarProps) {
  const status = statusColors[user.status] || statusColors.user

  return (
    <div className="w-64 h-full bg-[#1e293b] flex flex-col border-r border-[#334155]">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <div>
            <h1 className="text-[#f8fafc] font-bold text-lg">TorCalculator</h1>
            <span className="text-[#64748b] text-xs">Версия: 0.0.1</span>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="h-px bg-[#334155]" />
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
                  ? "bg-[#3b82f6]/20 text-[#3b82f6]"
                  : "text-[#94a3b8] hover:bg-[#334155]/50 hover:text-[#f8fafc]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#334155]">
        <div className="bg-[#0f172a]/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#334155] flex items-center justify-center">
              <span className="text-[#f8fafc] font-semibold uppercase">
                {user.username.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#f8fafc] font-medium truncate">{user.username}</p>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.bg} text-white`}
              >
                {status.label}
              </span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-lg text-[#94a3b8] hover:bg-[#334155] hover:text-red-400 transition-colors"
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
