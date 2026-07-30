"use client"

import { Banknote, Check, Package, ShieldCheck, Sparkles, Volume2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const releaseItems = [
  {
    icon: Volume2,
    title: "Звуки готовы сразу",
    text: "Выбранные звуки и громкость загружаются при старте — больше не нужно открывать настройки и запускать предпрослушивание.",
  },
  {
    icon: Package,
    title: "Количество имущества",
    text: "У каждой позиции появилось количество. Если его не указывать, сохраняется ноль.",
  },
  {
    icon: Banknote,
    title: "Количество при продаже",
    text: "В окне продажи можно указать проданное количество — оно сохранится в описании сделки.",
  },
  {
    icon: ShieldCheck,
    title: "Бережное обновление данных",
    text: "Старое имущество автоматически получает количество 0, поэтому существующие записи остаются на месте.",
  },
]

export function WhatsNewDialog({
  accepting,
  onAccept,
}: {
  accepting: boolean
  onAccept: () => void
}) {
  return (
    <Dialog open>
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
              Обновление 0.0.6
            </div>
            <DialogTitle className="text-2xl leading-tight tracking-[-0.025em]">
              Что нового в TorCalculator
            </DialogTitle>
            <DialogDescription className="text-[#9b9b95]">
              Звуки с первого действия и точный учёт количества имущества.
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
