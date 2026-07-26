"use client"

import { useEffect, useState } from "react"
import { LoaderCircle, Play, RotateCw, Volume2, VolumeX } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SOUND_NONE_VALUE,
  getSoundSelection,
  loadSoundVolume,
  listSoundFiles,
  loadSoundSelection,
  playSoundFile,
  saveSoundVolume,
  saveSoundSelection,
  type SoundAction,
  type SoundFile,
} from "@/lib/sound-settings"

type SoundState = Record<SoundAction, SoundFile[]>
type SelectionState = Record<SoundAction, string>

const actionMeta: {
  action: SoundAction
  title: string
  description: string
}[] = [
  {
    action: "add",
    title: "Добавление сделки",
    description: "Воспроизводится после успешного сохранения новой сделки.",
  },
  {
    action: "delete",
    title: "Удаление сделки",
    description: "Воспроизводится после удаления одной сделки или очистки истории.",
  },
]

function prettySize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export function SoundSettings() {
  const [files, setFiles] = useState<SoundState>({ add: [], delete: [] })
  const [selected, setSelected] = useState<SelectionState>({
    add: SOUND_NONE_VALUE,
    delete: SOUND_NONE_VALUE,
  })
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState<SoundAction | null>(null)
  const [volume, setVolume] = useState(72)

  const refresh = async () => {
    setLoading(true)
    const [addFiles, deleteFiles, addSelection, deleteSelection, savedVolume] = await Promise.all([
      listSoundFiles("add"),
      listSoundFiles("delete"),
      loadSoundSelection("add"),
      loadSoundSelection("delete"),
      loadSoundVolume(),
    ])
    setFiles({ add: addFiles, delete: deleteFiles })
    const validAddSelection = addFiles.some((file) => file.name === addSelection)
      ? addSelection
      : SOUND_NONE_VALUE
    const validDeleteSelection = deleteFiles.some((file) => file.name === deleteSelection)
      ? deleteSelection
      : SOUND_NONE_VALUE
    setSelected({
      add: validAddSelection,
      delete: validDeleteSelection,
    })
    if (validAddSelection !== addSelection) void saveSoundSelection("add", SOUND_NONE_VALUE)
    if (validDeleteSelection !== deleteSelection) void saveSoundSelection("delete", SOUND_NONE_VALUE)
    setVolume(Math.round(savedVolume * 100))
    setLoading(false)
  }

  useEffect(() => {
    setSelected({
      add: getSoundSelection("add"),
      delete: getSoundSelection("delete"),
    })
    void refresh()
  }, [])

  const choose = (action: SoundAction, value: string) => {
    setSelected((current) => ({ ...current, [action]: value }))
    void saveSoundSelection(action, value)
  }

  const preview = async (action: SoundAction) => {
    const filename = selected[action]
    if (filename === SOUND_NONE_VALUE) return
    setPlaying(action)
    await playSoundFile(action, filename)
    window.setTimeout(() => setPlaying((current) => current === action ? null : current), 450)
  }

  const changeVolume = (values: number[]) => {
    setVolume(values[0] ?? 0)
  }

  const commitVolume = (values: number[]) => {
    const nextVolume = values[0] ?? 0
    setVolume(nextVolume)
    void saveSoundVolume(nextVolume / 100)
  }

  return (
    <section className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-card)] p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--tor-bg-soft)]">
            <Volume2 className="h-5 w-5 text-[var(--tor-accent)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#f2f0ec]">Звуки сделок</h2>
            <p className="mt-0.5 text-sm text-[#9b9b95]">Отдельный отклик для каждого действия</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-[var(--tor-border)] bg-[var(--tor-bg-input)] px-3 text-sm text-[#f2f0ec] transition-colors hover:bg-[var(--tor-bg-soft)] disabled:opacity-50"
        >
          <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Обновить список
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--tor-bg-soft)]">
              {volume === 0
                ? <VolumeX className="h-4 w-4 text-[#9b9b95]" />
                : <Volume2 className="h-4 w-4 text-[var(--tor-accent-strong)]" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#f2f0ec]">Общая громкость</h3>
              <p className="mt-0.5 text-xs text-[#9b9b95]">Для всех звуков сделок и предпрослушивания</p>
            </div>
          </div>
          <output
            htmlFor="sound-volume"
            className="min-w-12 text-right text-sm font-semibold tabular-nums text-[#f2f0ec]"
          >
            {volume}%
          </output>
        </div>
        <Slider
          id="sound-volume"
          min={0}
          max={100}
          step={1}
          value={[volume]}
          onValueChange={changeVolume}
          onValueCommit={commitVolume}
          aria-label="Громкость звуков"
          aria-valuetext={`${volume} процентов`}
          className="h-10 [&_[data-slot=slider-track]]:bg-[var(--tor-bg-control)] [&_[data-slot=slider-range]]:bg-[var(--tor-accent)] [&_[data-slot=slider-thumb]]:size-5"
        />
      </div>

      <div className="space-y-3">
        {actionMeta.map(({ action, title, description }) => (
          <div
            key={action}
            className="rounded-lg border border-[var(--tor-border-soft)] bg-[var(--tor-bg-input)] p-4"
          >
            <div className="flex items-center justify-between gap-5">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[#f2f0ec]">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-[#9b9b95]">{description}</p>
              </div>
              <div className="flex w-[300px] shrink-0 items-center gap-2">
                <Select
                  value={selected[action]}
                  onValueChange={(value) => choose(action, value)}
                  disabled={loading}
                >
                  <SelectTrigger
                    className="h-10 min-w-0 flex-1 border-[var(--tor-border-strong)] bg-[var(--tor-bg-card)] text-[#f2f0ec]"
                    aria-label={`Звук: ${title}`}
                  >
                    <SelectValue placeholder="Без звука" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--tor-border)] bg-[var(--tor-bg-card)] text-[#f2f0ec]">
                    <SelectItem value={SOUND_NONE_VALUE}>Без звука</SelectItem>
                    {files[action].map((file) => (
                      <SelectItem key={file.name} value={file.name}>
                        <span className="flex items-center gap-2">
                          <span>{file.label}</span>
                          <span className="text-xs text-[#767a80]">{prettySize(file.size)}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => void preview(action)}
                  disabled={loading || selected[action] === SOUND_NONE_VALUE}
                  aria-label={`Прослушать звук: ${title}`}
                  title="Прослушать"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--tor-border-strong)] bg-[var(--tor-bg-card)] text-[var(--tor-accent-strong)] transition-[background-color,transform] hover:bg-[var(--tor-bg-soft)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {playing === action
                    ? <LoaderCircle className="h-4 w-4 animate-spin" />
                    : <Play className="h-4 w-4 translate-x-px" />}
                </button>
              </div>
            </div>
            {!loading && files[action].length === 0 && (
              <p className="mt-3 border-t border-[var(--tor-border-soft)] pt-3 text-xs text-[#767a80]">
                Добавьте аудиофайлы в папку sounds/transaction-{action === "add" ? "add" : "delete"} и обновите список.
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
