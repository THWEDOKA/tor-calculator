export const TOR_TRANSACTIONS_CHANGED = "torcalc-transactions-changed"

export function notifyTransactionsChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(TOR_TRANSACTIONS_CHANGED))
}
