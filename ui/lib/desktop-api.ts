export type DesktopApiResult<T> = { ok: true } & T | { ok: false; error: string }

declare global {
  interface Window {
    pywebview?: {
      api?: Record<string, (...args: any[]) => any>
    }
  }
}

export function isDesktop(): boolean {
  return typeof window !== "undefined" && !!window.pywebview?.api
}

export async function callDesktop<T = any>(method: string, ...args: any[]): Promise<T> {
  const api = window.pywebview?.api
  if (!api) {
    throw new Error("PYWEBVIEW_NOT_AVAILABLE")
  }
  const fn = api[method]
  if (typeof fn !== "function") {
    throw new Error(`PYWEBVIEW_METHOD_NOT_FOUND:${method}`)
  }
  return await fn(...args)
}

