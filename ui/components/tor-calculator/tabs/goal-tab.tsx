"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarDays, ClipboardPaste, ImageIcon, Plus, RotateCcw, Target, Trash2 } from "lucide-react"
import { ru } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageFilePicker } from "@/components/tor-calculator/image-file-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { loadGoalAsync, saveGoalAsync, type StoredGoal } from "@/lib/goal-storage"
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

function formatMoney(value: number) {
  return `$${Math.max(0, Math.round(value)).toLocaleString("ru-RU")}`
}

function formatDate(value: string) {
  if (!value) return "Без срока"
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
  })
}

function formatChartDate(date: Date) {
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
  })
}

function dayKey(date: Date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return local.toISOString().slice(0, 10)
}

function toDateValue(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 10)
}

function daysLeft(value: string) {
  if (!value) return "Срок не задан"
  const today = new Date()
  const deadline = new Date(`${value}T23:59:59`)
  const diff = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return "Срок прошёл"
  if (diff === 0) return "Последний день"
  return `Осталось ${diff} д.`
}

function formatCompactMoney(value: number) {
  const rounded = Math.max(0, Math.round(value))
  if (rounded >= 1000000) return `${Math.round(rounded / 1000000)} млн.`
  if (rounded >= 1000) return `${Math.round(rounded / 1000)} тыс.`
  return String(rounded)
}

function CircularProgress({ progress }: { progress: number }) {
  const radius = 70
  const stroke = 11
  const normalized = radius - stroke / 2
  const circumference = normalized * 2 * Math.PI
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference

  return (
    <div className="relative h-40 w-40">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={normalized}
          fill="transparent"
          stroke="var(--tor-bg-soft)"
          strokeWidth={stroke}
        />
        <circle
          cx="70"
          cy="70"
          r={normalized}
          fill="transparent"
          stroke="var(--tor-accent)"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-semibold text-[#f2f0ec]">{Math.round(progress)}%</div>
        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[#767a80]">прогресс</div>
      </div>
    </div>
  )
}

export function GoalTab() {
  const [goal, setGoal] = useState<StoredGoal | null>(null)
  const [title, setTitle] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [deadline, setDeadline] = useState("")
  const [imageDataUrl, setImageDataUrl] = useState("")
  const [progressAmount, setProgressAmount] = useState("")
  const [error, setError] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"reset" | "delete" | null>(null)
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editRemaining, setEditRemaining] = useState("")
  const [editImageDataUrl, setEditImageDataUrl] = useState("")
  const pasteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadGoalAsync().then(setGoal)
  }, [])

  const persistGoal = (next: StoredGoal | null) => {
    setGoal(next)
    void saveGoalAsync(next)
  }

  const handlePasteImage = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.type.startsWith("image/")) continue
      const file = item.getAsFile()
      if (!file) return
      e.preventDefault()
      const reader = new FileReader()
      reader.onload = () => setImageDataUrl(String(reader.result ?? ""))
      reader.readAsDataURL(file)
      return
    }
  }

  const handleEditPasteImage = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.type.startsWith("image/")) continue
      const file = item.getAsFile()
      if (!file) return
      e.preventDefault()
      const reader = new FileReader()
      reader.onload = () => setEditImageDataUrl(String(reader.result ?? ""))
      reader.readAsDataURL(file)
      return
    }
  }

  const createGoal = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(targetAmount.replace(",", "."))
    const name = title.trim()
    if (!name || Number.isNaN(amount) || amount <= 0) {
      setError(true)
      setTimeout(() => setError(false), 500)
      return
    }
    persistGoal({
      title: name,
      imageDataUrl,
      targetAmount: amount,
      currentAmount: 0,
      deadline,
      createdAt: new Date().toISOString(),
    })
  }

  const previewTitle = title.trim() || "Новая цель"
  const previewAmount = parseFloat(targetAmount.replace(",", "."))
  const previewTarget = Number.isNaN(previewAmount) || previewAmount <= 0 ? 0 : previewAmount
  const selectedDeadline = deadline ? new Date(`${deadline}T00:00:00`) : undefined

  const addProgress = (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal) return
    const amount = parseFloat(progressAmount.replace(",", "."))
    if (Number.isNaN(amount)) return
    const nextAmount = Math.min(goal.targetAmount, Math.max(0, goal.currentAmount + amount))
    const appliedAmount = Math.max(0, nextAmount - goal.currentAmount)
    const next = {
      ...goal,
      currentAmount: nextAmount,
      contributions:
        appliedAmount > 0
          ? [
              {
                id: Date.now(),
                amount: appliedAmount,
                comment: "Ручное пополнение",
                createdAt: new Date().toISOString(),
              },
              ...(goal.contributions ?? []),
            ].slice(0, 80)
          : goal.contributions,
    }
    persistGoal(next)
    setProgressAmount("")
  }

  const openEditGoal = () => {
    if (!goal) return
    setEditTitle(goal.title)
    setEditRemaining(String(Math.max(0, goal.targetAmount - goal.currentAmount)))
    setEditImageDataUrl(goal.imageDataUrl)
    setEditOpen(true)
  }

  const saveGoalEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal) return
    const name = editTitle.trim()
    const nextRemaining = parseFloat(editRemaining.replace(",", "."))
    if (!name || Number.isNaN(nextRemaining) || nextRemaining < 0) return
    persistGoal({
      ...goal,
      title: name,
      imageDataUrl: editImageDataUrl,
      targetAmount: goal.currentAmount + nextRemaining,
    })
    setEditOpen(false)
  }

  if (!goal) {
    return (
      <div className="animate-in fade-in duration-300">
        <form
          onSubmit={createGoal}
          className="grid min-h-[620px] overflow-hidden rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-card)] lg:grid-cols-[minmax(0,1fr)_430px]"
        >
          <section className="flex min-h-0 flex-col justify-between border-b border-[var(--tor-border-soft)] p-7 lg:border-b-0 lg:border-r">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--tor-bg-soft)]">
                  <Target className="h-5 w-5 text-[var(--tor-accent-strong)]" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#f2f0ec]">Создать цель</h2>
                </div>
              </div>

              <div className="max-w-[620px] space-y-5">
                <div>
                  <Label className="text-[#9b9b95]">Название</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например, Дом в Палето"
                    className="mt-2 h-12 bg-[var(--tor-bg-input)] border-[var(--tor-border)] text-base text-[#f2f0ec]"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-[#9b9b95]">Сумма цели ($)</Label>
                    <Input
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="1000000"
                      className={`mt-2 h-12 bg-[var(--tor-bg-input)] border-[var(--tor-border)] text-base text-[#f2f0ec] ${error ? "border-[var(--tor-accent)] animate-shake" : ""}`}
                    />
                  </div>
                  <div>
                    <Label className="text-[#9b9b95]">Срок цели</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="mt-2 flex h-12 w-full items-center justify-between rounded-md border border-[var(--tor-border)] bg-[var(--tor-bg-input)] px-3 text-left text-base text-[#f2f0ec] outline-none transition-colors hover:border-[var(--tor-border-strong)] focus:border-[var(--tor-accent)]"
                        >
                          <span className={deadline ? "text-[#f2f0ec]" : "text-[#767a80]"}>
                            {deadline ? formatDate(deadline) : "Выбрать дату"}
                          </span>
                          <CalendarDays className="h-4 w-4 text-[var(--tor-accent-strong)]" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-auto border-[var(--tor-border)] bg-[var(--tor-bg-card)] p-0 text-[#f2f0ec] shadow-2xl shadow-black/40"
                      >
                        <div className="border-b border-[var(--tor-border-soft)] px-4 py-3">
                          <div className="text-sm font-medium">Срок цели</div>
                          <div className="mt-1 text-xs text-[#767a80]">
                            {deadline ? daysLeft(deadline) : "Дата не выбрана"}
                          </div>
                        </div>
                        <Calendar
                          mode="single"
                          locale={ru}
                          selected={selectedDeadline}
                          onSelect={(date) => date && setDeadline(toDateValue(date))}
                          disabled={{ before: new Date() }}
                          className="w-[318px] p-4 text-[#f2f0ec] [--cell-size:38px]"
                          classNames={{
                            root: "w-full",
                            month: "w-full space-y-4",
                            table: "w-full border-collapse",
                            weekdays: "grid grid-cols-7 gap-1",
                            caption_label: "text-[#f2f0ec]",
                            weekday: "flex h-8 items-center justify-center text-xs font-medium text-[#767a80]",
                            week: "grid grid-cols-7 gap-1",
                            day: "h-[38px] w-[38px] p-0 text-[#d2d0cb]",
                            today: "rounded-md bg-[var(--tor-bg-soft)] text-[#f2f0ec]",
                          }}
                        />
                        <div className="flex items-center justify-between gap-2 border-t border-[var(--tor-border-soft)] p-3">
                          <button
                            type="button"
                            onClick={() => setDeadline("")}
                            className="rounded-md px-3 py-2 text-sm text-[#9b9b95] transition-colors hover:bg-[var(--tor-bg-soft)] hover:text-[#f2f0ec]"
                          >
                            Без срока
                          </button>
                          <div className="rounded-md bg-[#271b1d] px-3 py-2 text-sm text-[var(--tor-accent-strong)]">
                            {deadline ? formatDate(deadline) : "Не задано"}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0 rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-5">
                <div className="grid min-w-0 grid-cols-[auto_minmax(72px,1fr)_minmax(0,auto)] items-center gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-[#767a80]">Сейчас</div>
                    <div className="mt-1 text-2xl font-semibold text-[#7fb89b]">$0</div>
                  </div>
                  <div className="min-w-0 px-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--tor-border-soft)]">
                      <div className="h-full w-0 rounded-full bg-[var(--tor-accent)]" />
                    </div>
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="text-xs text-[#767a80]">Нужно</div>
                    <div className="mt-1 max-w-[260px] break-words text-2xl font-semibold leading-tight text-[#f2f0ec] [overflow-wrap:anywhere]">
                      {previewTarget ? formatMoney(previewTarget) : "$0"}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-[#767a80]">
                  <CalendarDays className="h-4 w-4 text-[var(--tor-accent-strong)]" />
                  {deadline ? daysLeft(deadline) : "Без срока"}
                </div>
              </div>

              <Button type="submit" className="h-12 w-full bg-[var(--tor-accent)] px-6 text-white hover:bg-[var(--tor-accent-hover)] xl:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Создать цель
              </Button>
            </div>
          </section>

          <aside className="flex min-h-[420px] flex-col bg-[#131416] p-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-medium text-[#f2f0ec]">Превью</div>
              <div className="rounded-full border border-[var(--tor-border)] px-3 py-1 text-xs text-[#9b9b95]">
                {deadline ? formatDate(deadline) : "Без срока"}
              </div>
            </div>

            <div
              ref={pasteRef}
              tabIndex={0}
              onPaste={handlePasteImage}
              className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--tor-border)] bg-[var(--tor-bg-dark)] outline-none focus:border-[var(--tor-accent)]"
            >
              {imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-[#767a80]">
                    <ClipboardPaste className="mx-auto mb-3 h-9 w-9" />
                    <div className="text-sm">Вставьте картинку</div>
                    <div className="mt-1 text-xs">Ctrl+V</div>
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[var(--tor-bg-dark)] via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="mb-3 inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-sm text-[#f2f0ec] backdrop-blur">
                  <ImageIcon className="h-4 w-4 text-[var(--tor-accent-strong)]" />
                  0%
                </div>
                <h3 className="line-clamp-2 text-3xl font-semibold tracking-tight text-[#f2f0ec]">
                  {previewTitle}
                </h3>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--tor-border-soft)]">
                  <div className="h-full w-0 rounded-full bg-[var(--tor-accent)]" />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[#7fb89b]">$0</span>
                  <span className="text-[#f2f0ec]">{previewTarget ? formatMoney(previewTarget) : "$0"}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ImageFilePicker onImageSelected={setImageDataUrl} />
              {imageDataUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-10 text-[#9b9b95]"
                  onClick={() => setImageDataUrl("")}
                >
                  Убрать картинку
                </Button>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-[#767a80]">
              <CalendarDays className="h-4 w-4" />
              {deadline ? daysLeft(deadline) : "Срок можно оставить пустым"}
            </div>
          </aside>
        </form>
      </div>
    )
  }

  const progress = (goal.currentAmount / goal.targetAmount) * 100
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
  const contributions = [...(goal.contributions ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const recentContributions = [...contributions].reverse().slice(0, 3)
  const today = new Date()
  const dailyAmounts = new Map<string, number>()
  contributions.forEach((contribution) => {
    const key = dayKey(new Date(contribution.createdAt))
    dailyAmounts.set(key, (dailyAmounts.get(key) ?? 0) + contribution.amount)
  })
  const chartSamples = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - 29 + index)
    const amount = dailyAmounts.get(dayKey(date)) ?? 0
    return { date, value: amount, amount }
  })
  const chartMax = Math.max(...chartSamples.map((sample) => sample.value), 1)
  const chart = { left: 64, right: 18, top: 12, bottom: 28, width: 700, height: 160 }
  const plotWidth = chart.width - chart.left - chart.right
  const plotHeight = chart.height - chart.top - chart.bottom
  const points = chartSamples.map((sample, index) => {
    const x = chart.left + (chartSamples.length === 1 ? 0 : (index / (chartSamples.length - 1)) * plotWidth)
    const y = chart.top + plotHeight - (sample.value / chartMax) * plotHeight
    return { ...sample, x, y }
  })
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ")
  const baselineY = chart.top + plotHeight
  const areaPath =
    points.length > 0
      ? `M ${linePoints} L ${points[points.length - 1].x},${baselineY} L ${points[0].x},${baselineY} Z`
      : ""
  const yTicks = [chartMax, chartMax * 0.75, chartMax * 0.5, chartMax * 0.25, 0]
  const xLabelIndexes = [0, 7, 14, 21, 29]
  const hoveredPoint =
    hoveredPointIndex !== null && points[hoveredPointIndex] ? points[hoveredPointIndex] : null

  return (
    <div className="animate-in fade-in duration-300">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="overflow-hidden rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-card)]">
          <button
            type="button"
            onClick={openEditGoal}
            className="group relative block min-h-[205px] w-full overflow-hidden bg-[var(--tor-bg-input)] text-left"
          >
            {goal.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={goal.imageDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--tor-border-strong)]">
                <ImageIcon className="h-16 w-16" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--tor-bg-card)] via-[var(--tor-bg-card)]/30 to-transparent" />
            <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-[#f2f0ec] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
              Редактировать
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="mb-1.5 inline-flex rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-[#f2f0ec] backdrop-blur">
                {daysLeft(goal.deadline)}
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#f2f0ec]">{goal.title}</h2>
              <div className="mt-1.5 flex items-center gap-2 text-sm text-[#d2d0cb]">
                <CalendarDays className="h-4 w-4" />
                {formatDate(goal.deadline)}
              </div>
            </div>
          </button>

          <div className="grid gap-2.5 p-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-3">
              <div className="text-xs text-[#767a80]">Накоплено</div>
              <div className="mt-0.5 text-lg font-semibold text-[#7fb89b]">{formatMoney(goal.currentAmount)}</div>
            </div>
            <div className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-3">
              <div className="text-xs text-[#767a80]">Осталось</div>
              <div className="mt-0.5 text-lg font-semibold text-[var(--tor-accent-strong)]">{formatMoney(remaining)}</div>
            </div>
            <div className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-3">
              <div className="text-xs text-[#767a80]">Цель</div>
              <div className="mt-0.5 text-lg font-semibold text-[#f2f0ec]">{formatMoney(goal.targetAmount)}</div>
            </div>
          </div>
        </section>

        <aside className="space-y-2.5">
          <div className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-card)] p-3">
            <div className="flex justify-center">
              <CircularProgress progress={progress} />
            </div>
            <form onSubmit={addProgress} className="mt-3 flex gap-2">
              <Input
                value={progressAmount}
                onChange={(e) => setProgressAmount(e.target.value)}
                placeholder="Сумма"
                className="bg-[var(--tor-bg-input)] border-[var(--tor-border)] text-[#f2f0ec]"
              />
              <Button type="submit" className="bg-[var(--tor-accent)] hover:bg-[var(--tor-accent-hover)] text-white">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction("reset")}
              className="flex items-center justify-center gap-2 rounded-lg bg-[var(--tor-bg-soft)] px-3 py-2 text-sm text-[#f2f0ec] hover:bg-[var(--tor-bg-control)]"
            >
              <RotateCcw className="h-4 w-4" />
              Сброс
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction("delete")}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#271b1d] px-3 py-2 text-sm text-[var(--tor-accent-strong)] hover:bg-[#332124]"
            >
              <Trash2 className="h-4 w-4" />
              Удалить
            </button>
          </div>
        </aside>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="overflow-hidden rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-card)] p-3">
          <div className="mb-1 flex items-center justify-between px-1">
            <div className="font-semibold text-[#f2f0ec]">Динамика цели</div>
            <div className="text-sm text-[#767a80]">30 дней</div>
          </div>
          <svg
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            className="h-[190px] w-full"
            onMouseLeave={() => setHoveredPointIndex(null)}
          >
            <defs>
              <linearGradient id="goalAreaFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--tor-accent-strong)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--tor-accent-strong)" stopOpacity="0.03" />
              </linearGradient>
              <filter id="goalTooltipShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.35" />
              </filter>
            </defs>

            {yTicks.map((tick, index) => {
              const y = chart.top + plotHeight - (tick / chartMax) * plotHeight
              return (
                <g key={index}>
                  <line
                    x1={chart.left}
                    x2={chart.width - chart.right}
                    y1={y}
                    y2={y}
                    stroke="var(--tor-border)"
                    strokeDasharray="4 5"
                    strokeOpacity="0.72"
                  />
                  <text x={chart.left - 10} y={y + 4} textAnchor="end" className="fill-[#767a80] text-[11px]">
                    {formatCompactMoney(tick)}
                  </text>
                </g>
              )
            })}

            {xLabelIndexes.map((index) => {
              const point = points[index]
              if (!point) return null
              return (
                <text key={index} x={point.x} y={chart.height - 6} textAnchor="middle" className="fill-[#767a80] text-[11px]">
                  {formatChartDate(point.date)}
                </text>
              )
            })}

            <path d={areaPath} fill="url(#goalAreaFill)" />
            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--tor-accent-strong)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={hoveredPointIndex === index ? "5" : "4"}
                fill={hoveredPointIndex === index ? "var(--tor-accent-strong)" : "var(--tor-bg-card)"}
                stroke="var(--tor-accent-strong)"
                strokeWidth="2"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPointIndex(index)}
                onFocus={() => setHoveredPointIndex(index)}
              />
            ))}
            {hoveredPoint && (
              <g>
                <line x1={hoveredPoint.x} x2={hoveredPoint.x} y1={chart.top} y2={baselineY} stroke="var(--tor-border-strong)" strokeDasharray="4 5" />
                <g
                  transform={`translate(${Math.min(Math.max(hoveredPoint.x - 68, chart.left), chart.width - 156)}, ${Math.max(hoveredPoint.y - 58, chart.top + 2)})`}
                  filter="url(#goalTooltipShadow)"
                >
                  <rect width="138" height="48" rx="7" fill="#271b1d" stroke="var(--tor-accent-strong)" strokeOpacity="0.55" />
                  <line x1="17" x2="31" y1="17" y2="17" stroke="var(--tor-accent-hover)" strokeWidth="2" />
                  <text x="39" y="20" className="fill-[#f2f0ec] text-[14px] font-semibold">
                    {formatMoney(hoveredPoint.amount)}
                  </text>
                  <text x="39" y="36" className="fill-[var(--tor-accent-strong)] text-[11px]">
                    {formatChartDate(hoveredPoint.date)}
                  </text>
                </g>
              </g>
            )}
          </svg>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--tor-border-soft)]">
            <div className="h-full rounded-full bg-[var(--tor-accent-strong)]" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-[#767a80]">
            <span>0%</span>
            <span>{Math.round(progress)}%</span>
            <span>100%</span>
          </div>
        </section>

        <aside className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-card)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold text-[#f2f0ec]">Последние пополнения</div>
            <div className="text-sm text-[#767a80]">3</div>
          </div>
          {recentContributions.length > 0 ? (
            <div className="space-y-2">
              {recentContributions.map((item) => (
                <div key={item.id} className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-[#f2f0ec]">{item.comment || "Пополнение цели"}</div>
                      <div className="mt-1 text-xs text-[#767a80]">{formatShortDate(item.createdAt)}</div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-[#7fb89b]">{formatMoney(item.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--tor-border)] bg-[var(--tor-bg-input)] p-4 text-sm text-[#767a80]">
              Пока пусто
            </div>
          )}
        </aside>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="bg-[var(--tor-bg-card)] border-[var(--tor-border)] text-[#f2f0ec]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "delete" ? "Удалить цель?" : "Сбросить прогресс?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#9b9b95]">
              {confirmAction === "delete"
                ? "Цель будет полностью удалена вместе с картинкой, суммой и текущим прогрессом."
                : "Текущий прогресс станет равен нулю, но сама цель останется."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[var(--tor-bg-control)] border-[var(--tor-border-strong)] text-[#f2f0ec] hover:bg-[var(--tor-bg-control-hover)]">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--tor-accent)] text-white hover:bg-[var(--tor-accent-hover)]"
              onClick={() => {
                if (confirmAction === "delete") persistGoal(null)
                if (confirmAction === "reset") persistGoal({ ...goal, currentAmount: 0, contributions: [] })
                setConfirmAction(null)
              }}
            >
              {confirmAction === "delete" ? "Удалить" : "Сбросить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl border-[var(--tor-border)] bg-[var(--tor-bg-card)] text-[#f2f0ec]">
          <DialogHeader>
            <DialogTitle>Редактировать цель</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveGoalEdit} className="grid gap-5 md:grid-cols-[1fr_240px]">
            <div className="space-y-4">
              <div>
                <Label className="text-[#9b9b95]">Название</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-2 bg-[var(--tor-bg-input)] border-[var(--tor-border)] text-[#f2f0ec]"
                />
              </div>
              <div>
                <Label className="text-[#9b9b95]">Осталось ($)</Label>
                <Input
                  value={editRemaining}
                  onChange={(e) => setEditRemaining(e.target.value)}
                  className="mt-2 bg-[var(--tor-bg-input)] border-[var(--tor-border)] text-[#f2f0ec]"
                />
              </div>
              <div className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-3 text-sm text-[#767a80]">
                Новая цель: {formatMoney((goal?.currentAmount ?? 0) + Math.max(0, parseFloat(editRemaining.replace(",", ".")) || 0))}
              </div>
            </div>

            <div>
              <div
                tabIndex={0}
                onPaste={handleEditPasteImage}
                className="relative min-h-[230px] overflow-hidden rounded-lg border border-dashed border-[var(--tor-border-strong)] bg-[var(--tor-bg-input)] outline-none focus:border-[var(--tor-accent)]"
              >
                {editImageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editImageDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-center text-[#767a80]">
                    <div>
                      <ClipboardPaste className="mx-auto mb-3 h-8 w-8" />
                      <div className="text-sm">Вставьте картинку</div>
                      <div className="mt-1 text-xs">Ctrl+V</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ImageFilePicker onImageSelected={setEditImageDataUrl} />
                {editImageDataUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-10 text-[#9b9b95]"
                    onClick={() => setEditImageDataUrl("")}
                  >
                    Убрать картинку
                  </Button>
                )}
              </div>
            </div>

            <DialogFooter className="md:col-span-2">
              <Button
                type="button"
                onClick={() => setEditOpen(false)}
                className="bg-[var(--tor-bg-control)] text-[#f2f0ec] hover:bg-[var(--tor-bg-control-hover)]"
              >
                Отмена
              </Button>
              <Button type="submit" className="bg-[var(--tor-accent)] text-white hover:bg-[var(--tor-accent-hover)]">
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
