import { callDesktop, isDesktop } from "@/lib/desktop-api"

export type SoundAction = "add" | "delete"

export type SoundFile = {
  name: string
  label: string
  size: number
}

const NO_SOUND = "__none__"
const DEFAULT_VOLUME = 0.72
const LS_SOUND_VOLUME = "tor-sound-volume"
const DESKTOP_SOUND_VOLUME = "sound:volume"
const soundDataCache = new Map<string, string>()
const activeAudio = new Map<SoundAction, HTMLAudioElement>()
let soundInitialization: Promise<void> | null = null
let removeUnlockListeners: (() => void) | null = null

// Короткий пустой WAV нужен только для снятия ограничения WebView на первое
// воспроизведение. Он запускается в момент первого обычного клика пользователя.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA"

export const SOUND_NONE_VALUE = NO_SOUND
export const DEFAULT_SOUND_VOLUME = DEFAULT_VOLUME

function normalizeVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME
  return Math.min(1, Math.max(0, value))
}

function localKey(action: SoundAction) {
  return `tor-sound-${action}`
}

function desktopKey(action: SoundAction) {
  return `sound:${action}`
}

export function getSoundSelection(action: SoundAction): string {
  if (typeof window === "undefined") return NO_SOUND
  return localStorage.getItem(localKey(action)) || NO_SOUND
}

export function getSoundVolume(): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME
  const raw = localStorage.getItem(LS_SOUND_VOLUME)
  if (raw === null) return DEFAULT_VOLUME
  const saved = Number(raw)
  return normalizeVolume(saved)
}

export async function loadSoundVolume(): Promise<number> {
  const local = getSoundVolume()
  if (!isDesktop()) return local
  try {
    const result = await callDesktop<{ ok: boolean; value?: string | null }>(
      "setting_get",
      DESKTOP_SOUND_VOLUME
    )
    if (result.ok && result.value !== null && result.value !== undefined) {
      const desktopVolume = normalizeVolume(Number(result.value))
      localStorage.setItem(LS_SOUND_VOLUME, String(desktopVolume))
      return desktopVolume
    }
    await callDesktop("setting_set", DESKTOP_SOUND_VOLUME, String(local))
  } catch {
    // Локальная настройка остаётся рабочим резервом.
  }
  return local
}

export async function saveSoundVolume(volume: number): Promise<void> {
  const normalized = normalizeVolume(volume)
  localStorage.setItem(LS_SOUND_VOLUME, String(normalized))
  if (!isDesktop()) return
  try {
    await callDesktop("setting_set", DESKTOP_SOUND_VOLUME, String(normalized))
  } catch {
    // Локальная копия уже сохранена.
  }
}

export async function loadSoundSelection(action: SoundAction): Promise<string> {
  const local = getSoundSelection(action)
  if (!isDesktop()) return local
  try {
    const result = await callDesktop<{ ok: boolean; value?: string | null }>(
      "setting_get",
      desktopKey(action)
    )
    if (result.ok && result.value) {
      localStorage.setItem(localKey(action), result.value)
      return result.value
    }
    if (local !== NO_SOUND) {
      await callDesktop("setting_set", desktopKey(action), local)
    }
  } catch {
    // Локальная настройка остаётся рабочим резервом.
  }
  return local
}

export async function saveSoundSelection(action: SoundAction, filename: string): Promise<void> {
  localStorage.setItem(localKey(action), filename)
  if (!isDesktop()) return
  try {
    await callDesktop("setting_set", desktopKey(action), filename)
  } catch {
    // Локальная копия уже сохранена.
  }
}

export async function listSoundFiles(action: SoundAction): Promise<SoundFile[]> {
  if (!isDesktop()) return []
  try {
    const result = await callDesktop<{ ok: boolean; items?: SoundFile[] }>(
      "sound_files_list",
      action
    )
    return result.ok && Array.isArray(result.items) ? result.items : []
  } catch {
    return []
  }
}

async function getSoundData(action: SoundAction, filename: string): Promise<string | null> {
  const cacheKey = `${action}:${filename}`
  const cached = soundDataCache.get(cacheKey)
  if (cached) return cached
  if (!isDesktop()) return null
  try {
    const result = await callDesktop<{ ok: boolean; dataUrl?: string }>(
      "sound_file_data",
      action,
      filename
    )
    if (!result.ok || !result.dataUrl) return null
    soundDataCache.set(cacheKey, result.dataUrl)
    return result.dataUrl
  } catch {
    return null
  }
}

export function initializeSoundSettings(): Promise<void> {
  if (soundInitialization) return soundInitialization

  soundInitialization = (async () => {
    const [addSelection, deleteSelection] = await Promise.all([
      loadSoundSelection("add"),
      loadSoundSelection("delete"),
      loadSoundVolume(),
    ])

    await Promise.all([
      addSelection === NO_SOUND ? null : getSoundData("add", addSelection),
      deleteSelection === NO_SOUND ? null : getSoundData("delete", deleteSelection),
    ])
  })().catch(() => {
    // Повторная попытка допустима, если desktop API ещё не успел подготовиться.
    soundInitialization = null
  })

  return soundInitialization
}

export function installSoundUnlock(): () => void {
  if (typeof window === "undefined") return () => {}
  if (removeUnlockListeners) return removeUnlockListeners

  const unlock = () => {
    const audio = new Audio(SILENT_WAV)
    audio.volume = 0
    void audio.play().catch(() => {})
    cleanup()
  }
  const cleanup = () => {
    window.removeEventListener("pointerdown", unlock, true)
    window.removeEventListener("keydown", unlock, true)
    window.removeEventListener("touchstart", unlock, true)
    removeUnlockListeners = null
  }

  window.addEventListener("pointerdown", unlock, true)
  window.addEventListener("keydown", unlock, true)
  window.addEventListener("touchstart", unlock, true)
  removeUnlockListeners = cleanup
  return cleanup
}

export async function playSoundFile(action: SoundAction, filename: string): Promise<boolean> {
  if (!filename || filename === NO_SOUND) return false
  const dataUrl = await getSoundData(action, filename)
  if (!dataUrl) return false

  const previous = activeAudio.get(action)
  if (previous) {
    previous.pause()
    previous.currentTime = 0
  }

  const audio = new Audio(dataUrl)
  audio.volume = getSoundVolume()
  activeAudio.set(action, audio)
  audio.addEventListener("ended", () => {
    if (activeAudio.get(action) === audio) activeAudio.delete(action)
  }, { once: true })

  try {
    await audio.play()
    return true
  } catch {
    return false
  }
}

export async function playActionSound(action: SoundAction): Promise<boolean> {
  await initializeSoundSettings()
  return await playSoundFile(action, getSoundSelection(action))
}
