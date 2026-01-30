"use client"

import { useEffect, useState } from "react"
import { AuthWindow } from "./auth-window"
import { MainWindow } from "./main-window"
import { WindowTitlebar } from "./window-titlebar"
import { isDesktop } from "@/lib/desktop-api"

interface User {
  username: string
  status: string
}

export function TorCalculatorApp() {
  const [user, setUser] = useState<User | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (!isDesktop()) return
    document.body.classList.add("tor-desktop")
    return () => {
      document.body.classList.remove("tor-desktop")
    }
  }, [])

  const handleLoginSuccess = (loggedUser: User) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setUser(loggedUser)
      setIsTransitioning(false)
    }, 100)
  }

  const handleLogout = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setUser(null)
      setIsTransitioning(false)
    }, 300)
  }

  return (
    <div className="h-screen w-screen bg-[#0f172a]">
      <div className="h-full w-full overflow-hidden bg-[#0f172a] border border-[#334155]">
        <WindowTitlebar />
        <div className={`${isTransitioning ? "opacity-0" : "opacity-100"} transition-opacity duration-300 h-[calc(100%-44px)]`}>
          {!user ? (
            <AuthWindow onSuccess={handleLoginSuccess} />
          ) : (
            <MainWindow user={user} onLogout={handleLogout} />
          )}
        </div>
      </div>
    </div>
  )
}
