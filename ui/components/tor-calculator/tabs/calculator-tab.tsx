"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { callDesktop, isDesktop } from "@/lib/desktop-api"

interface Transaction {
  id: number
  amount: number
  comment: string
  createdAt: Date
}

export function CalculatorTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [amount, setAmount] = useState("")
  const [comment, setComment] = useState("")
  const [error, setError] = useState(false)
  const [success, setSuccess] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadTransactions = useCallback(async () => {
    if (isDesktop()) {
      const res = await callDesktop<{ ok: boolean; items?: any[] }>("transactions_list")
      if ((res as any).ok && Array.isArray((res as any).items)) {
        setTransactions(
          (res as any).items.map((t: any) => ({
            id: Number(t.id),
            amount: Number(t.amount),
            comment: String(t.comment ?? ""),
            createdAt: new Date(String(t.createdAt)),
          }))
        )
        return
      }
    }

    const saved = localStorage.getItem("tor-transactions")
    if (saved) {
      const parsed = JSON.parse(saved)
      setTransactions(
        parsed.map((t: Transaction & { createdAt: string }) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        }))
      )
    } else {
      setTransactions([])
    }
  }, [])

  useEffect(() => {
    void loadTransactions()
  }, [loadTransactions])

  useEffect(() => {
    if (!isDesktop()) {
      localStorage.setItem("tor-transactions", JSON.stringify(transactions))
    }
  }, [transactions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)

    if (isNaN(numAmount)) {
      setError(true)
      setTimeout(() => setError(false), 500)
      return
    }

    const trimmed = comment.trim()

    if (isDesktop()) {
      const res = await callDesktop<{ ok: boolean; item?: any }>("transaction_add", numAmount, trimmed)
      if ((res as any).ok && (res as any).item) {
        const t = (res as any).item
        const newTransaction: Transaction = {
          id: Number(t.id),
          amount: Number(t.amount),
          comment: String(t.comment ?? ""),
          createdAt: new Date(String(t.createdAt)),
        }
        setTransactions((prev) => [newTransaction, ...prev])
        setAmount("")
        setComment("")
        setSuccess(true)
        setTimeout(() => setSuccess(false), 600)
        return
      }
      setError(true)
      setTimeout(() => setError(false), 500)
      return
    }

    const newTransaction: Transaction = { id: Date.now(), amount: numAmount, comment: trimmed, createdAt: new Date() }
    setTransactions((prev) => [newTransaction, ...prev])
    setAmount("")
    setComment("")
    setSuccess(true)
    setTimeout(() => setSuccess(false), 600)
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    setTimeout(() => {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      setDeletingId(null)
    }, 300)

    if (isDesktop()) {
      try {
        await callDesktop("transaction_delete", id)
      } catch {
        // best-effort; UI уже обновился
      }
    }
  }

  const totalBalance = transactions.reduce((sum, t) => sum + t.amount, 0)
  const totalPositive = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalNegative = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatAmount = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString("ru-RU")}`
  }

  return (
    <div className="animate-in fade-in duration-300 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-[#f5f5f5] mb-6">Калькулятор сделок</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161616] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#e81c5a]/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#e81c5a]" />
            </div>
            <div>
              <div className="text-sm text-[#a3a3a3]">Общий баланс</div>
              <div className={`text-xl font-bold ${totalBalance >= 0 ? "text-[#10b981]" : "text-red-400"}`}>
                {formatAmount(totalBalance)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#161616] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#10b981]" />
            </div>
            <div>
              <div className="text-sm text-[#a3a3a3]">Доходы</div>
              <div className="text-xl font-bold text-[#10b981]">{formatAmount(totalPositive)}</div>
            </div>
          </div>
        </div>

        <div className="bg-[#161616] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-sm text-[#a3a3a3]">Расходы</div>
              <div className="text-xl font-bold text-red-400">{formatAmount(totalNegative)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[320px_1fr] gap-6 min-h-0">
        <div className="bg-[#161616] rounded-xl p-6 border border-[#2a2a2a] h-fit">
          <h2 className="text-lg font-semibold text-[#f5f5f5] mb-4">Добавить запись</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#a3a3a3] mb-2">Сумма</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="800, -700, 900"
                className={`w-full px-4 py-3 bg-[#0e0e0e] border rounded-lg text-[#f5f5f5] placeholder-[#737373] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#e81c5a]/50 focus:border-[#e81c5a] ${
                  error ? "border-red-500 animate-shake" : "border-[#2a2a2a]"
                } ${success ? "animate-success-pulse border-[#10b981]" : ""}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#a3a3a3] mb-2">Комментарий</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Введите комментарий к сделке..."
                rows={3}
                className="w-full px-4 py-3 bg-[#0e0e0e] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] placeholder-[#737373] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#e81c5a]/50 focus:border-[#e81c5a] resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-[#e81c5a] to-[#b81448] text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-[#e81c5a]/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Сохранить запись
            </button>
          </form>
        </div>

        <div className="bg-[#161616] rounded-xl border border-[#2a2a2a] flex flex-col min-h-0">
          <div className="p-4 border-b border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-[#f5f5f5]">
              История сделок{" "}
              <span className="text-[#a3a3a3] font-normal">({transactions.length})</span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#a3a3a3]">
                <Wallet className="w-12 h-12 mb-3 opacity-50" />
                <p>Нет записей</p>
                <p className="text-sm">Добавьте первую сделку</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`group relative rounded-lg p-4 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                    deletingId === transaction.id ? "animate-slide-out-up" : "animate-scale-in"
                  } ${
                    transaction.amount >= 0
                      ? "bg-[#1e3a1e] border-[#22c55e]/30 hover:border-[#22c55e]/50"
                      : "bg-[#3a1e1e] border-red-500/30 hover:border-red-500/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-xl font-bold ${
                          transaction.amount >= 0 ? "text-[#22c55e]" : "text-red-400"
                        }`}
                      >
                        {formatAmount(transaction.amount)}
                      </div>
                      {transaction.comment && (
                        <p className="text-[#a3a3a3] text-sm mt-1 break-words">
                          {transaction.comment}
                        </p>
                      )}
                      <p className="text-[#737373] text-xs mt-2">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(transaction.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
