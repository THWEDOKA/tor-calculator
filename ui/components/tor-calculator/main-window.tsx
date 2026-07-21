"use client"

import { useState, useCallback } from "react"
import { Sidebar } from "./sidebar"
import { CalculatorTab } from "./tabs/calculator-tab"
import { GoalTab } from "./tabs/goal-tab"
import { ItemsTab } from "./tabs/items-tab"
import { SettingsTab } from "./tabs/settings-tab"

type TabType = "calculator" | "goal" | "items" | "settings"

export function MainWindow() {
  const [activeTab, setActiveTab] = useState<TabType>("calculator")
  const [key, setKey] = useState(0)

  const handleClearData = useCallback(() => {
    setKey((prev) => prev + 1)
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case "calculator":
        return <CalculatorTab key={key} />
      case "goal":
        return <GoalTab />
      case "items":
        return <ItemsTab key={key} />
      case "settings":
        return <SettingsTab onClearData={handleClearData} />
      default:
        return <CalculatorTab key={key} />
    }
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--tor-bg-dark)] animate-in fade-in duration-500">
      <div className="relative z-10 shrink-0 border-b border-[var(--tor-border-soft)] bg-[var(--tor-bg-window-soft)]">
        <div className="mx-auto flex max-w-[1200px] items-center px-8">
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>

      <main className={`relative z-10 min-h-0 flex-1 overflow-x-hidden ${activeTab === "goal" ? "overflow-y-hidden" : "overflow-y-auto custom-scrollbar"}`}>
        <div className={`mx-auto flex min-h-full max-w-[1200px] flex-col px-8 ${activeTab === "goal" ? "py-5" : "py-7"}`}>
          <div className="flex-1 min-h-0">{renderContent()}</div>
        </div>
      </main>
    </div>
  )
}
