"use client"

import { Check, ListRestart, Sparkles, Target, Volume2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function StartupSplash({ progress }: { progress: number }) {
  const radius = 66
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--tor-bg-dark)]"
      role="status"
      aria-live="polite"
      aria-label={`Загрузка TorCalculator: ${progress}%`}
    >
      <div className="flex flex-col items-center px-6 text-center">
        <div className="relative h-40 w-40">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--tor-border-soft)"
              strokeWidth="7"
            />
            <circle
              className="tor-startup-progress"
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--tor-accent)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tabular-nums text-[#f2f0ec]">{progress}</span>
            <span className="mt-0.5 text-xs font-medium uppercase tracking-[0.18em] text-[#767a80]">
              процентов
            </span>
          </div>
        </div>
        <h1 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-[#f2f0ec]">
          TorCalculator
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#9b9b95]">
          <span className="font-semibold text-[var(--tor-accent-strong)]">@hamvpn_bot</span>
          {" "}лучший впн на рынке
        </p>
      </div>
    </div>
  )
}

const releaseItems = [
  {
    icon: Volume2,
    title: "Звуки сделок",
    text: "Выбирайте отдельные звуки для добавления и удаления и слушайте их прямо в настройках.",
  },
  {
    icon: Target,
    title: "Безопасная очистка",
    text: "При очистке решайте, удалять ли связанный со сделками прогресс цели.",
  },
  {
    icon: ListRestart,
    title: "Новый запуск",
    text: "Добавили аккуратный экран загрузки с круговым прогрессом от 0 до 100.",
  },
]

export function WhatsNewDialog({
  open,
  accepting,
  onAccept,
}: {
  open: boolean
  accepting: boolean
  onAccept: () => void
}) {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="border-[var(--tor-border)] bg-[var(--tor-bg-card)] p-0 text-[#f2f0ec] sm:max-w-xl"
      >
        <div className="border-b border-[var(--tor-border-soft)] px-6 pb-5 pt-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--tor-accent-bg)]">
            <Sparkles className="h-5 w-5 text-[var(--tor-accent-strong)]" />
          </div>
          <DialogHeader className="text-left">
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tor-accent-strong)]">
              Обновление 0.0.4
            </div>
            <DialogTitle className="text-2xl leading-tight tracking-[-0.025em]">
              Что нового в TorCalculator
            </DialogTitle>
            <DialogDescription className="text-[#9b9b95]">
              Больше контроля над сделками, целями и ощущением от работы.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-1 px-6 py-3">
          {releaseItems.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4 rounded-lg px-2 py-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--tor-bg-soft)]">
                <Icon className="h-4.5 w-4.5 text-[var(--tor-accent-strong)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#f2f0ec]">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-[#9b9b95]">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="border-t border-[var(--tor-border-soft)] px-6 py-5">
          <button
            type="button"
            autoFocus
            disabled={accepting}
            onClick={onAccept}
            className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[var(--tor-accent)] px-5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[var(--tor-accent-hover)] active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            <Check className="h-4 w-4" />
            {accepting ? "Сохраняю..." : "Принять и продолжить"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
