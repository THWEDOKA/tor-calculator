import { callDesktop, isDesktop } from "@/lib/desktop-api"

export type SoundAction = "add" | "delete"

export type SoundFile = {
  name: string
  label: string
  size: number
}

const NO_SOUND = "__none__"
const soundDataCache = new Map<string, string>()
const activeAudio = new Map<SoundAction, HTMLAudioElement>()

export const SOUND_NONE_VALUE = NO_SOUND

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
  audio.volume = 0.72
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
  return await playSoundFile(action, getSoundSelection(action))
}
