'use client'

import { useCallback, useState } from 'react'

interface ImageUploadProps {
  onUpload: (base64: string, mimeType: string, previewUrl: string) => void
  onClear: () => void
  previewUrl: string | null
}

export default function ImageUpload({ onUpload, onClear, previewUrl }: ImageUploadProps) {
  const [dragging, setDragging] = useState(false)

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        const base64 = result.split(',')[1]
        const preview = URL.createObjectURL(file)
        onUpload(base64, file.type, preview)
      }
      reader.readAsDataURL(file)
    },
    [onUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  if (previewUrl) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-zinc-800 aspect-video bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Input" className="w-full h-full object-cover" />
        <button
          onClick={onClear}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-zinc-950/80 border border-zinc-700 flex items-center justify-center hover:bg-zinc-800 transition-colors"
          aria-label="Remove image"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed aspect-video cursor-pointer transition-colors ${
        dragging
          ? 'border-blue-500 bg-blue-500/5'
          : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900'
      }`}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) processFile(file)
        }}
      />
      <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 12V6M6 9l3-3 3 3" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="1.5" y="1.5" width="15" height="15" rx="3" stroke="#71717a" strokeWidth="1.5"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm text-zinc-300">Drop image here or click to browse</p>
        <p className="text-xs text-zinc-500 mt-0.5">PNG, JPG, WEBP — max 10 MB</p>
      </div>
    </label>
  )
}
