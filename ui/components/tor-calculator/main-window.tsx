"use client"

import { useState, useCallback } from "react"
import { Sidebar } from "./sidebar"
import { HomeTab } from "./tabs/home-tab"
import { CalculatorTab } from "./tabs/calculator-tab"
import { SettingsTab } from "./tabs/settings-tab"

type TabType = "home" | "calculator" | "settings"

interface MainWindowProps {
  user: { username: string; status: string }
  onLogout: () => void
}

export function MainWindow({ user, onLogout }: MainWindowProps) {
  const [activeTab, setActiveTab] = useState<TabType>("home")
  const [key, setKey] = useState(0)

  const handleClearData = useCallback(() => {
    setKey((prev) => prev + 1)
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab />
      case "calculator":
        return <CalculatorTab key={key} />
      case "settings":
        return <SettingsTab onClearData={handleClearData} />
      default:
        return <HomeTab />
    }
  }

  return (
    <div className="flex h-full w-full bg-[#0f172a] animate-in fade-in duration-500">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={onLogout}
      />

      <main className="flex-1 p-8 overflow-auto custom-scrollbar">
        <div className="max-w-[1100px] mx-auto h-full">{renderContent()}</div>
      </main>
    </div>
  )
}
