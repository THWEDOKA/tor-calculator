"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import { Plus, Target, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { callDesktop, isDesktop } from "@/lib/desktop-api"
import { addGoalProgressAsync, loadGoal, removeGoalContributionsByTransactionIds } from "@/lib/goal-storage"
import { TOR_TRANSACTIONS_CHANGED } from "@/lib/tor-events"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const LS_CALC_GOAL_MODE = "tor-calculator-goal-mode"

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
  const [goalMode, setGoalMode] = useState<"with" | "without">("without")
  const [clearOpen, setClearOpen] = useState(false)

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
    const refresh = () => {
      void loadTransactions()
    }
    window.addEventListener(TOR_TRANSACTIONS_CHANGED, refresh)
    return () => window.removeEventListener(TOR_TRANSACTIONS_CHANGED, refresh)
  }, [loadTransactions])

  useEffect(() => {
    const saved = localStorage.getItem(LS_CALC_GOAL_MODE)
    if (saved === "with" || saved === "without") setGoalMode(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_CALC_GOAL_MODE, goalMode)
  }, [goalMode])

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

    const addPositiveToGoal = (value: number, createdAt: Date | string, transactionId: number) => {
      if (goalMode !== "with" || value <= 0) return
      void addGoalProgressAsync(value, { comment: trimmed, createdAt, transactionId })
    }

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
        addPositiveToGoal(numAmount, newTransaction.createdAt, newTransaction.id)
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
    addPositiveToGoal(numAmount, newTransaction.createdAt, newTransaction.id)
  }

  const handleDelete = async (id: number) => {
    const transaction = transactions.find((t) => t.id === id)
    setDeletingId(id)
    setTimeout(() => {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      setDeletingId(null)
    }, 300)

    if (transaction?.amount && transaction.amount > 0) {
      void removeGoalContributionsByTransactionIds([transaction.id])
    }

    if (isDesktop()) {
      try {
        await callDesktop("transaction_delete", id)
      } catch {
        // best-effort; UI уже обновился
      }
    }
  }

  const handleClearTransactions = async () => {
    const positiveTransactionIds = transactions.filter((tx) => tx.amount > 0).map((tx) => tx.id)
    if (isDesktop()) {
      try {
        await callDesktop("transaction_history_clear")
      } catch {
        // local fallback ниже
      }
    }
    localStorage.removeItem("tor-transactions")
    void removeGoalContributionsByTransactionIds(positiveTransactionIds)
    setTransactions([])
    setClearOpen(false)
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
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--tor-bg-card)] rounded-lg p-4 border border-[var(--tor-border-soft)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--tor-bg-soft)] flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#d56a72]" />
            </div>
            <div>
              <div className="text-sm text-[#9b9b95]">Общий баланс</div>
              <div className={`text-xl font-semibold ${totalBalance >= 0 ? "text-[#7fb89b]" : "text-[#d56a72]"}`}>
                {formatAmount(totalBalance)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--tor-bg-card)] rounded-lg p-4 border border-[var(--tor-border-soft)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--tor-bg-soft)] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#7fb89b]" />
            </div>
            <div>
              <div className="text-sm text-[#9b9b95]">Доходы</div>
              <div className="text-xl font-semibold text-[#7fb89b]">{formatAmount(totalPositive)}</div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--tor-bg-card)] rounded-lg p-4 border border-[var(--tor-border-soft)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--tor-bg-soft)] flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-[#d56a72]" />
            </div>
            <div>
              <div className="text-sm text-[#9b9b95]">Расходы</div>
              <div className="text-xl font-semibold text-[#d56a72]">{formatAmount(totalNegative)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[340px_1fr] gap-6 min-h-0">
        <div className="bg-[var(--tor-bg-card)] rounded-lg p-6 border border-[var(--tor-border-soft)] h-fit">
          <h2 className="text-lg font-semibold text-[#f2f0ec] mb-4">Добавить запись</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#9b9b95] mb-2">Сумма</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="800, -700, 900"
                className={`w-full px-4 py-3 bg-[var(--tor-bg-input)] border rounded-lg text-[#f2f0ec] placeholder-[#767a80] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#c84b55]/35 focus:border-[#c84b55] ${
                  error ? "border-[#c84b55] animate-shake" : "border-[var(--tor-border)]"
                } ${success ? "animate-success-pulse border-[#7fb89b]" : ""}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#9b9b95] mb-2">Комментарий</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Введите комментарий к сделке..."
                rows={3}
                className="w-full px-4 py-3 bg-[var(--tor-bg-input)] border border-[var(--tor-border)] rounded-lg text-[#f2f0ec] placeholder-[#767a80] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#c84b55]/35 focus:border-[#c84b55] resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#c84b55] text-white font-semibold rounded-lg transition-all duration-200 hover:bg-[#d55c66] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Сохранить запись
            </button>

            <div className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-2">
              <div className="mb-2 flex items-center gap-2 px-2 text-xs text-[#767a80]">
                <Target className="h-3.5 w-3.5" />
                Положительные суммы
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setGoalMode("with")}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    goalMode === "with" ? "bg-[var(--tor-bg-soft)] text-[#f2f0ec]" : "text-[#9b9b95] hover:text-[#f2f0ec]"
                  }`}
                  title={loadGoal() ? "Плюсовые сделки будут прибавляться к цели" : "Сначала создайте цель"}
                >
                  В цель
                </button>
                <button
                  type="button"
                  onClick={() => setGoalMode("without")}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    goalMode === "without" ? "bg-[var(--tor-bg-soft)] text-[#f2f0ec]" : "text-[#9b9b95] hover:text-[#f2f0ec]"
                  }`}
                >
                  Не в цель
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-[var(--tor-bg-card)] rounded-lg border border-[var(--tor-border-soft)] flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--tor-border-soft)]">
            <h2 className="text-lg font-semibold text-[#f2f0ec]">
              История сделок{" "}
              <span className="text-[#9b9b95] font-normal">({transactions.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => setClearOpen(true)}
              disabled={transactions.length === 0}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#332124] bg-[#271b1d] px-3 text-sm text-[#d56a72] transition-colors hover:bg-[#332124] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
              Очистить
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#9b9b95]">
                <Wallet className="w-12 h-12 mb-3 opacity-50" />
                <p>Нет записей</p>
                <p className="text-sm">Добавьте первую сделку</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`group relative rounded-lg p-4 border transition-all duration-200 ${
                    deletingId === transaction.id ? "animate-slide-out-up" : "animate-scale-in"
                  } ${
                    transaction.amount >= 0
                      ? "bg-[#18231f] border-[#7fb89b]/25 hover:border-[#7fb89b]/45"
                      : "bg-[#271b1d] border-[#c84b55]/25 hover:border-[#c84b55]/45"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-xl font-bold ${
                          transaction.amount >= 0 ? "text-[#7fb89b]" : "text-[#d56a72]"
                        }`}
                      >
                        {formatAmount(transaction.amount)}
                      </div>
                      {transaction.comment && (
                        <p className="text-[#9b9b95] text-sm mt-1 break-words">
                          {transaction.comment}
                        </p>
                      )}
                      <p className="text-[#767a80] text-xs mt-2">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(transaction.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-[#d56a72] hover:bg-[#c84b55]/12 transition-all"
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

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent className="bg-[var(--tor-bg-card)] border-[var(--tor-border)] text-[#f2f0ec]">
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить сделки?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9b9b95]">
              История сделок будет удалена. Имущество и цель останутся на месте.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[var(--tor-bg-control)] border-[var(--tor-border-strong)] text-[#f2f0ec] hover:bg-[var(--tor-bg-control-hover)]">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearTransactions}
              className="bg-[#c84b55] text-white hover:bg-[#b9434d]"
            >
              Очистить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
