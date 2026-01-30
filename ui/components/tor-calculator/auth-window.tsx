"use client"

import React from "react"

import { useState } from "react"
import { User, Lock, Loader2 } from "lucide-react"
import { callDesktop, isDesktop } from "@/lib/desktop-api"

interface AuthWindowProps {
  onSuccess: (user: { username: string; status: string }) => void
}

export function AuthWindow({ onSuccess }: AuthWindowProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(false)
    setIsLoading(true)

    // Небольшая задержка для UX (анимация/спиннер)
    await new Promise((resolve) => setTimeout(resolve, 350))

    try {
      if (isDesktop()) {
        const res = await callDesktop<{ ok: boolean; user?: { username: string; status: string } }>(
          "auth_login",
          username,
          password
        )
        if ((res as any).ok && (res as any).user) {
          setIsSuccess(true)
          setTimeout(() => onSuccess((res as any).user), 250)
          return
        }
        setError(true)
        setIsLoading(false)
        return
      }

      // Fallback для запуска в браузере (без pywebview) — оставляем простую "заглушку"
      if (username.toLowerCase() === "triazov" && password === "winner123234") {
        setIsSuccess(true)
        setTimeout(() => onSuccess({ username: "triazov", status: "developer" }), 250)
        return
      }

      setError(true)
      setIsLoading(false)
    } catch {
      setError(true)
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex items-center justify-center h-full w-full bg-[#0f172a]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#0f172a] to-[#2d1b4e] opacity-80" />
      
      <div
        className={`relative w-[400px] rounded-2xl overflow-hidden transition-all duration-500 ${
          isSuccess ? "animate-fly-away" : "animate-scale-in"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/10 via-transparent to-[#8b5cf6]/10" />
        
        <div className="relative p-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[#f8fafc] mb-2">
              Добро пожаловать в TorCalculator
            </h1>
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              Перекупай, играй на Majestic и запоминай свой заработок в нашей программе
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Логин"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full pl-11 pr-4 py-3 bg-[#1e293b]/80 border rounded-lg text-[#f8fafc] placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 focus:border-[#3b82f6] ${
                  error
                    ? "border-red-500 animate-shake animate-pulse-border"
                    : "border-[#334155]"
                }`}
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-11 pr-4 py-3 bg-[#1e293b]/80 border rounded-lg text-[#f8fafc] placeholder-[#64748b] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 focus:border-[#3b82f6] ${
                  error
                    ? "border-red-500 animate-shake animate-pulse-border"
                    : "border-[#334155]"
                }`}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center animate-scale-in">
                Неверный логин или пароль
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-[#3b82f6]/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Вход...
                </span>
              ) : (
                "Войти"
              )}
            </button>
          </form>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-[#3b82f6] animate-spin" />
            <span className="text-[#94a3b8] text-sm">Авторизация...</span>
          </div>
        </div>
      )}
    </div>
  )
}
