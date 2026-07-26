"use client"

import { useRef, type ChangeEvent } from "react"
import { FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ImageFilePicker({
  onImageSelected,
  className = "",
}: {
  onImageSelected: (dataUrl: string) => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !file.type.startsWith("image/")) return

    const reader = new FileReader()
    reader.onload = () => onImageSelected(String(reader.result ?? ""))
    reader.readAsDataURL(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={`min-h-10 bg-[var(--tor-bg-control)] text-[#f2f0ec] hover:bg-[var(--tor-bg-control-hover)] ${className}`}
        onClick={() => inputRef.current?.click()}
      >
        <FolderOpen className="h-4 w-4" />
        Выбрать файл
      </Button>
    </>
  )
}
