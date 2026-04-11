"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  ImageIcon,
  Package,
  Plus,
  Trash2,
  Banknote,
  X,
  CheckCircle2,
  ClipboardPaste,
  LayoutGrid,
  List,
} from "lucide-react"
import { callDesktop, isDesktop } from "@/lib/desktop-api"
import { notifyTransactionsChanged } from "@/lib/tor-events"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const LS_ITEMS = "tor-items"
const LS_ITEMS_VIEW = "tor-items-view"
const LS_ITEMS_CALC_MODE = "tor-items-calc-mode"

export interface InventoryItem {
  id: number
  name: string
  purchasePrice: number
  imageDataUrl: string
  purchasedAt: string
  purchaseTxId: number
}

function formatMoney(n: number) {
  return `$${n.toLocaleString("ru-RU")}`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

/** Длительность владения предметом до продажи (человекочитаемо, ru) */
function formatHeldDuration(fromIso: string, toDate: Date = new Date()): string {
  const ms = Math.max(0, toDate.getTime() - new Date(fromIso).getTime())
  const sec = Math.floor(ms / 1000)
  const days = Math.floor(sec / 86400)
  const hours = Math.floor((sec % 86400) / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const parts: string[] = []
  if (days > 0) parts.push(`${days} д.`)
  if (hours > 0) parts.push(`${hours} ч.`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} мин.`)
  return parts.join(" ")
}

async function loadItems(): Promise<InventoryItem[]> {
  if (isDesktop()) {
    const res = await callDesktop<{ ok: boolean; items?: any[] }>("items_list")
    if ((res as any).ok && Array.isArray((res as any).items)) {
      return (res as any).items.map((it: any) => ({
        id: Number(it.id),
        name: String(it.name ?? ""),
        purchasePrice: Number(it.purchasePrice),
        imageDataUrl: String(it.imageDataUrl ?? ""),
        purchasedAt: String(it.purchasedAt),
        purchaseTxId: Number(it.purchaseTxId),
      }))
    }
    return []
  }
  const raw = localStorage.getItem(LS_ITEMS)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as InventoryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistItemsWeb(items: InventoryItem[]) {
  localStorage.setItem(LS_ITEMS, JSON.stringify(items))
}

export function ItemsTab() {
  type ViewMode = "cards" | "list"
  type CalcMode = "with" | "without"

  const [items, setItems] = useState<InventoryItem[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [calcMode, setCalcMode] = useState<CalcMode>("with")
  const [addOpen, setAddOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null)
  const [sellItem, setSellItem] = useState<InventoryItem | null>(null)
  const [sellPrice, setSellPrice] = useState("")
  const [newName, setNewName] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newImage, setNewImage] = useState<string>("")
  const [addError, setAddError] = useState(false)
  const pasteRef = useRef<HTMLDivElement>(null)

  const [sellOverlay, setSellOverlay] = useState<{
    heldLabel: string
    saleAmount: number
    purchasePrice: number
    savedToCalculator: boolean
  } | null>(null)

  const refresh = useCallback(async () => {
    const list = await loadItems()
    setItems(list)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem(LS_ITEMS_VIEW)
    if (stored === "cards" || stored === "list") {
      setViewMode(stored)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(LS_ITEMS_VIEW, viewMode)
  }, [viewMode])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem(LS_ITEMS_CALC_MODE)
    if (stored === "with" || stored === "without") {
      setCalcMode(stored)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(LS_ITEMS_CALC_MODE, calcMode)
  }, [calcMode])

  useEffect(() => {
    if (!addOpen) return
    const t = setTimeout(() => pasteRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [addOpen])

  const applyClipboardImage = useCallback((e: ClipboardEvent) => {
    const files = e.clipboardData?.files
    if (files?.length) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (f.type.startsWith("image/")) {
          e.preventDefault()
          const reader = new FileReader()
          reader.onload = () => setNewImage(String(reader.result ?? ""))
          reader.readAsDataURL(f)
          return
        }
      }
    }
    const itemsList = e.clipboardData?.items
    if (!itemsList) return
    for (let i = 0; i < itemsList.length; i++) {
      const it = itemsList[i]
      if (it.type.startsWith("image/")) {
        e.preventDefault()
        const blob = it.getAsFile()
        if (!blob) continue
        const reader = new FileReader()
        reader.onload = () => setNewImage(String(reader.result ?? ""))
        reader.readAsDataURL(blob)
        return
      }
    }
  }, [])

  useEffect(() => {
    if (!addOpen) return
    const onDocPaste = (ev: Event) => applyClipboardImage(ev as ClipboardEvent)
    document.addEventListener("paste", onDocPaste)
    return () => document.removeEventListener("paste", onDocPaste)
  }, [addOpen, applyClipboardImage])

  const handlePaste = (e: React.ClipboardEvent) => {
    applyClipboardImage(e.nativeEvent)
  }

  const resetAddForm = () => {
    setNewName("")
    setNewPrice("")
    setNewImage("")
    setAddError(false)
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const price = parseFloat(newPrice.replace(",", "."))
    const name = newName.trim()
    const writeToCalculator = calcMode === "with"
    if (!name || Number.isNaN(price) || price <= 0) {
      setAddError(true)
      setTimeout(() => setAddError(false), 500)
      return
    }

    if (isDesktop()) {
      const res = await callDesktop<{ ok: boolean; item?: any }>(
        "item_add",
        name,
        price,
        newImage || "",
        writeToCalculator
      )
      if ((res as any).ok && (res as any).item) {
        const it = (res as any).item
        const row: InventoryItem = {
          id: Number(it.id),
          name: String(it.name),
          purchasePrice: Number(it.purchasePrice),
          imageDataUrl: String(it.imageDataUrl ?? ""),
          purchasedAt: String(it.purchasedAt),
          purchaseTxId: Number(it.purchaseTxId),
        }
        setItems((prev) => [row, ...prev])
        resetAddForm()
        setAddOpen(false)
        if (writeToCalculator) notifyTransactionsChanged()
        return
      }
      setAddError(true)
      setTimeout(() => setAddError(false), 500)
      return
    }

    const purchaseTxId = writeToCalculator ? Date.now() : 0
    const purchasedAt = new Date().toISOString()
    const row: InventoryItem = {
      id: purchaseTxId,
      name,
      purchasePrice: price,
      imageDataUrl: newImage,
      purchasedAt,
      purchaseTxId,
    }
    if (writeToCalculator) {
      const tx = {
        id: purchaseTxId,
        amount: -Math.abs(price),
        comment: `Покупка предмета: ${name}`,
        createdAt: purchasedAt,
      }
      const saved = localStorage.getItem("tor-transactions")
      const list = saved ? JSON.parse(saved) : []
      localStorage.setItem("tor-transactions", JSON.stringify([tx, ...list]))
    }
    setItems((prev) => {
      const next = [row, ...prev]
      persistItemsWeb(next)
      return next
    })
    resetAddForm()
    setAddOpen(false)
    if (writeToCalculator) notifyTransactionsChanged()
  }

  const handleDelete = async (item: InventoryItem) => {
    const hasPurchaseTx = item.purchaseTxId > 0
    if (isDesktop()) {
      await callDesktop("item_delete", item.id, hasPurchaseTx)
    } else {
      if (hasPurchaseTx) {
        const saved = localStorage.getItem("tor-transactions")
        if (saved) {
          const list = JSON.parse(saved) as { id: number }[]
          const nextTx = list.filter((t) => t.id !== item.purchaseTxId)
          localStorage.setItem("tor-transactions", JSON.stringify(nextTx))
        }
      }
    }
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== item.id)
      if (!isDesktop()) persistItemsWeb(next)
      return next
    })
    if (detailItem?.id === item.id) setDetailItem(null)
    if (hasPurchaseTx) notifyTransactionsChanged()
  }

  const confirmSell = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sellItem) return
    const sale = parseFloat(sellPrice.replace(",", "."))
    const writeToCalculator = calcMode === "with"
    if (Number.isNaN(sale) || sale <= 0) return

    const name = sellItem.name
    const heldLabel = formatHeldDuration(sellItem.purchasedAt)

    if (isDesktop()) {
      if (writeToCalculator) {
        const res = await callDesktop<{ ok: boolean }>(
          "transaction_add",
          sale,
          `Продажа предмета: ${name}`
        )
        if (!(res as any).ok) return
      }
      await callDesktop("item_delete", sellItem.id, false)
    } else {
      if (writeToCalculator) {
        const tx = {
          id: Date.now(),
          amount: sale,
          comment: `Продажа предмета: ${name}`,
          createdAt: new Date().toISOString(),
        }
        const saved = localStorage.getItem("tor-transactions")
        const list = saved ? JSON.parse(saved) : []
        localStorage.setItem("tor-transactions", JSON.stringify([tx, ...list]))
      }
    }

    setItems((prev) => {
      const next = prev.filter((x) => x.id !== sellItem.id)
      if (!isDesktop()) persistItemsWeb(next)
      return next
    })
    if (detailItem?.id === sellItem.id) setDetailItem(null)
    setSellItem(null)
    setSellPrice("")
    setSellOverlay({
      heldLabel,
      saleAmount: sale,
      purchasePrice: sellItem.purchasePrice,
      savedToCalculator: writeToCalculator,
    })
    if (writeToCalculator) notifyTransactionsChanged()
    window.setTimeout(() => setSellOverlay(null), 3200)
  }

  return (
    <div className="animate-in fade-in duration-300 h-full flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Имущество</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#2a2a2a] bg-[#161616] p-1">
            <button
              type="button"
              onClick={() => setCalcMode("with")}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm transition-colors ${
                calcMode === "with"
                  ? "bg-[#10b981]/20 text-[#f5f5f5]"
                  : "text-[#a3a3a3] hover:text-[#f5f5f5]"
              }`}
              title="С занесением в калькулятор"
            >
              В калькулятор
            </button>
            <button
              type="button"
              onClick={() => setCalcMode("without")}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm transition-colors ${
                calcMode === "without"
                  ? "bg-[#e81c5a]/20 text-[#f5f5f5]"
                  : "text-[#a3a3a3] hover:text-[#f5f5f5]"
              }`}
              title="Без занесения в калькулятор"
            >
              Без калькулятора
            </button>
          </div>

          <div className="flex items-center rounded-lg border border-[#2a2a2a] bg-[#161616] p-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                viewMode === "cards"
                  ? "bg-[#e81c5a]/20 text-[#f5f5f5]"
                  : "text-[#a3a3a3] hover:text-[#f5f5f5]"
              }`}
              title="Карточки"
            >
              <LayoutGrid className="h-4 w-4" />
              Карточки
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                viewMode === "list"
                  ? "bg-[#e81c5a]/20 text-[#f5f5f5]"
                  : "text-[#a3a3a3] hover:text-[#f5f5f5]"
              }`}
              title="Список"
            >
              <List className="h-4 w-4" />
              Список
            </button>
          </div>

          <Button
            type="button"
            onClick={() => {
              resetAddForm()
              setAddOpen(true)
            }}
            className="bg-gradient-to-r from-[#e81c5a] to-[#b81448] hover:from-[#f02d68] hover:to-[#c4154a] text-white shadow-lg shadow-[#e81c5a]/20"
          >
            <Plus className="w-5 h-5 mr-2" />
            Добавить имущество
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#161616] p-12 text-[#a3a3a3]">
          <Package className="w-14 h-14 mb-4 opacity-40 text-[#e81c5a]" />
          <p className="text-lg text-[#f5f5f5] font-medium">Пока нет имущества</p>
          <p className="text-sm mt-2 text-center max-w-sm">
            Добавьте имущество с ценой покупки и при желании вставьте фото из буфера (Ctrl+V) в форме добавления.
          </p>
        </div>
      ) : (
        <>
          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailItem(item)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault()
                      setDetailItem(item)
                    }
                  }}
                  className="group relative rounded-xl border border-[#2a2a2a] bg-[#161616] overflow-hidden transition-all duration-300 hover:border-[#e81c5a]/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#e81c5a]/10 cursor-pointer text-left"
                >
                  <div className="aspect-[4/3] bg-[#0e0e0e] relative">
                    {item.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageDataUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#525252]">
                        <ImageIcon className="w-12 h-12 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-[#f5f5f5] line-clamp-2 mb-1">{item.name}</div>
                    <div className="text-[#e81c5a] font-bold">{formatMoney(item.purchasePrice)}</div>
                    <div className="text-xs text-[#737373] mt-2">Нажмите карточку для подробностей</div>
                  </div>
                  <div
                    className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Продать"
                      onClick={() => {
                        setSellItem(item)
                        setSellPrice("")
                      }}
                      className="p-2 rounded-lg bg-[#e81c5a] text-white hover:bg-[#f02d68] shadow-md"
                    >
                      <Banknote className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Удалить"
                      onClick={() => void handleDelete(item)}
                      className="p-2 rounded-lg bg-red-500/90 text-white hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailItem(item)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault()
                      setDetailItem(item)
                    }
                  }}
                  className="group flex items-center gap-4 rounded-xl border border-[#2a2a2a] bg-[#161616] p-3 transition-all duration-300 hover:border-[#e81c5a]/40 hover:shadow-lg hover:shadow-[#e81c5a]/10 cursor-pointer"
                >
                  <div className="h-16 w-16 rounded-lg overflow-hidden bg-[#0e0e0e] shrink-0">
                    {item.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[#525252]">
                        <ImageIcon className="w-6 h-6 opacity-60" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#f5f5f5] truncate">{item.name}</div>
                    <div className="text-[#e81c5a] font-semibold">{formatMoney(item.purchasePrice)}</div>
                    <div className="text-xs text-[#737373] mt-1">{formatDateTime(item.purchasedAt)}</div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(ev) => ev.stopPropagation()}>
                    <button
                      type="button"
                      title="Продать"
                      onClick={() => {
                        setSellItem(item)
                        setSellPrice("")
                      }}
                      className="p-2 rounded-lg bg-[#e81c5a] text-white hover:bg-[#f02d68] shadow-md"
                    >
                      <Banknote className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Удалить"
                      onClick={() => void handleDelete(item)}
                      className="p-2 rounded-lg bg-red-500/90 text-white hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[#161616] border-[#2a2a2a] text-[#f5f5f5] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новое имущество</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <Label htmlFor="item-name" className="text-[#a3a3a3]">
                Название
              </Label>
              <Input
                id="item-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Например, видеокарта"
                className="mt-1.5 bg-[#0e0e0e] border-[#2a2a2a] text-[#f5f5f5]"
              />
            </div>
            <div>
              <Label htmlFor="item-price" className="text-[#a3a3a3]">
                Цена покупки ($)
              </Label>
              <Input
                id="item-price"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="15000"
                className={`mt-1.5 bg-[#0e0e0e] border-[#2a2a2a] text-[#f5f5f5] ${addError ? "border-red-500 animate-shake" : ""}`}
              />
            </div>
            <div>
              <Label className="text-[#a3a3a3]">Фото (Ctrl+V)</Label>
              <div
                ref={pasteRef}
                tabIndex={0}
                onPaste={handlePaste}
                className={`mt-1.5 rounded-lg border-2 border-dashed min-h-[140px] flex flex-col items-center justify-center gap-2 p-4 outline-none focus:ring-2 focus:ring-[#e81c5a]/50 transition-colors ${
                  newImage ? "border-[#e81c5a]/50 bg-[#0e0e0e]" : "border-[#2a2a2a] bg-[#0e0e0e] hover:border-[#404040]"
                }`}
              >
                {newImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={newImage} alt="" className="max-h-28 max-w-full object-contain rounded-md" />
                ) : (
                  <>
                    <ClipboardPaste className="w-8 h-8 text-[#737373]" />
                    <span className="text-sm text-[#737373] text-center">
                      Кликните сюда и вставьте картинку из буфера
                    </span>
                  </>
                )}
              </div>
              {newImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-[#a3a3a3]"
                  onClick={() => setNewImage("")}
                >
                  Убрать фото
                </Button>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="secondary" onClick={() => setAddOpen(false)} className="bg-[#2a2a2a] text-[#f5f5f5]">
                Отмена
              </Button>
              <Button type="submit" className="bg-[#e81c5a] hover:bg-[#f02d68] text-white">
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="bg-[#161616] border-[#2a2a2a] text-[#f5f5f5] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{detailItem.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {detailItem.imageDataUrl ? (
                  <div className="rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#0e0e0e]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detailItem.imageDataUrl}
                      alt=""
                      className="w-full max-h-64 object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#2a2a2a] bg-[#0e0e0e] h-40 flex items-center justify-center text-[#525252]">
                    Нет изображения
                  </div>
                )}
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-[#737373]">Цена покупки</dt>
                  <dd className="text-[#e81c5a] font-semibold">{formatMoney(detailItem.purchasePrice)}</dd>
                  <dt className="text-[#737373]">Время покупки</dt>
                  <dd>{formatDateTime(detailItem.purchasedAt)}</dd>
                  <dt className="text-[#737373]">В инвентаре</dt>
                  <dd>{formatHeldDuration(detailItem.purchasedAt)}</dd>
                  <dt className="text-[#737373]">ID записи</dt>
                  <dd className="text-[#a3a3a3] font-mono text-xs">{detailItem.id}</dd>
                </dl>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-[#2a2a2a] text-[#f5f5f5]"
                  onClick={() => {
                    setSellItem(detailItem)
                    setSellPrice("")
                  }}
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Продать
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    void handleDelete(detailItem)
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!sellItem} onOpenChange={(o) => !o && setSellItem(null)}>
        <DialogContent className="bg-[#161616] border-[#2a2a2a] text-[#f5f5f5] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Продажа: {sellItem?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={confirmSell} className="space-y-4">
            <div>
              <Label htmlFor="sell-price" className="text-[#a3a3a3]">
                Цена продажи ($)
              </Label>
              <Input
                id="sell-price"
                autoFocus
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="Сколько получили"
                className="mt-1.5 bg-[#0e0e0e] border-[#2a2a2a] text-[#f5f5f5]"
              />
              {sellItem && (
                <p className="text-xs text-[#737373] mt-2">
                  {calcMode === "with"
                    ? `Закупка ${formatMoney(sellItem.purchasePrice)} уже в расходах. После продажи сумма ниже попадёт в доходы.`
                    : "Сделка пройдёт только в имуществе, без записи в калькулятор."}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setSellItem(null)} className="bg-[#2a2a2a] text-[#f5f5f5]">
                Отмена
              </Button>
              <Button type="submit" className="bg-[#e81c5a] hover:bg-[#f02d68] text-white">
                Подтвердить продажу
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {sellOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 animate-in fade-in duration-200">
          <div className="relative animate-sell-success mx-4 max-w-md w-full rounded-2xl border border-[#e81c5a]/40 bg-[#161616] p-8 text-center shadow-2xl shadow-[#e81c5a]/20">
            <button
              type="button"
              className="absolute top-4 right-4 p-2 rounded-lg text-[#737373] hover:bg-[#2a2a2a] hover:text-[#f5f5f5]"
              aria-label="Закрыть"
              onClick={() => setSellOverlay(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="inline-flex rounded-full bg-[#e81c5a]/20 p-4 mb-4">
              <CheckCircle2 className="w-14 h-14 text-[#e81c5a]" />
            </div>
            <h3 className="text-2xl font-bold text-[#f5f5f5] mb-2">Продано!</h3>
            <p className="text-[#e81c5a] text-lg font-semibold mb-1">{formatMoney(sellOverlay.saleAmount)}</p>
            <p className="text-[#a3a3a3] text-sm mb-4">
              Предмет был у вас: <span className="text-[#f5f5f5] font-medium">{sellOverlay.heldLabel}</span>
            </p>
            <p className="text-xs text-[#737373]">
              {sellOverlay.savedToCalculator
                ? `Закупка ${formatMoney(sellOverlay.purchasePrice)} учтена в расходах, выручка — в доходах калькулятора.`
                : "Продажа сохранена только в имуществе, без записи в калькулятор."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
