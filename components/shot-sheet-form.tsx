'use client'

import { useState, useCallback } from 'react'
import type { DirectorFormSubmission } from '@/lib/types'

const MOOD_OPTIONS = [
  'Warm & intimate',
  'Dramatic & tense',
  'Cold & isolated',
  'Playful & kinetic',
  'Mysterious & slow',
  'Epic & cinematic',
  'Raw & documentary',
]

interface ShotSheetFormProps {
  onGenerate: (data: DirectorFormSubmission) => void
  loading: boolean
}

interface ImageField {
  base64: string
  mime: string
  preview: string
  name: string
}

const MAX_IMAGE_PX = 1024

function useImageField() {
  const [field, setField] = useState<ImageField | null>(null)

  const process = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > MAX_IMAGE_PX || height > MAX_IMAGE_PX) {
        if (width >= height) { height = Math.round(height * MAX_IMAGE_PX / width); width = MAX_IMAGE_PX }
        else { width = Math.round(width * MAX_IMAGE_PX / height); height = MAX_IMAGE_PX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (!blob) return
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          setField({
            base64: result.split(',')[1],
            mime: 'image/jpeg',
            preview: URL.createObjectURL(blob),
            name: file.name,
          })
        }
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.85)
    }
    img.src = objectUrl
  }, [])

  return { field, process, clear: () => setField(null) }
}

function ImageDropzone({
  label,
  hint,
  field,
  onProcess,
  onClear,
}: {
  label: string
  hint: string
  field: ImageField | null
  onProcess: (f: File) => void
  onClear: () => void
}) {
  const [dragging, setDragging] = useState(false)

  if (field) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={field.preview} alt={label} className="w-full h-28 object-cover" />
        <div className="absolute inset-0 bg-zinc-950/60 flex items-end p-3 justify-between">
          <p className="text-xs text-zinc-300 truncate max-w-[70%]">{field.name}</p>
          <button
            type="button"
            onClick={onClear}
            className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) onProcess(file)
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed h-28 cursor-pointer transition-colors ${
        dragging
          ? 'border-blue-500 bg-blue-500/5'
          : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600'
      }`}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onProcess(f) }}
      />
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 11V5M6 8l3-3 3 3" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="1.5" y="1.5" width="15" height="15" rx="3" stroke="#52525b" strokeWidth="1.5"/>
      </svg>
      <div className="text-center">
        <p className="text-xs text-zinc-400 font-medium">{label}</p>
        <p className="text-[11px] text-zinc-600">{hint}</p>
      </div>
    </label>
  )
}

export default function ShotSheetForm({ onGenerate, loading }: ShotSheetFormProps) {
  const [scene, setScene] = useState('')
  const [mood, setMood] = useState('')
  const [shotCount, setShotCount] = useState(5)
  const [assisting, setAssisting] = useState(false)
  const [styleNote, setStyleNote] = useState('')
  const [assistError, setAssistError] = useState('')
  const char = useImageField()
  const env = useImageField()

  const canAssist = !!(char.field)   // need at least character image
  const canSubmit = scene.trim().length > 0

  // ── AI Suggest: analyze uploaded images → fill form ──────────────────────
  const handleAssist = async () => {
    if (!canAssist || assisting) return
    setAssisting(true)
    setStyleNote('')
    setAssistError('')

    try {
      const res = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_image_base64: char.field?.base64,
          character_image_mime: char.field?.mime,
          environment_image_base64: env.field?.base64,
          environment_image_mime: env.field?.mime,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Assist failed')

      // Auto-fill all fields with AI suggestions
      setScene(data.scene_description ?? '')
      if (data.mood && MOOD_OPTIONS.includes(data.mood)) setMood(data.mood)
      if (data.shot_count) setShotCount(Math.min(Math.max(data.shot_count, 3), 8))
      if (data.style_notes) setStyleNote(data.style_notes)
    } catch (err) {
      console.error('Assist error:', err)
      setAssistError(err instanceof Error ? err.message : 'AI 分析失败，请重试')
    } finally {
      setAssisting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    onGenerate({
      scene_description: scene.trim(),
      character_image_base64: char.field?.base64,
      character_image_mime: char.field?.mime,
      environment_image_base64: env.field?.base64,
      environment_image_mime: env.field?.mime,
      mood: mood || undefined,
      shot_count: shotCount,
      _characterPreviewUrl: char.field?.preview,
      _environmentPreviewUrl: env.field?.preview,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {/* Reference images */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Character Reference
          </label>
          <ImageDropzone
            label="Character / Subject"
            hint="Who is in the scene?"
            field={char.field}
            onProcess={char.process}
            onClear={char.clear}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Environment / Object
            <span className="ml-1 text-zinc-600 normal-case tracking-normal">(optional)</span>
          </label>
          <ImageDropzone
            label="Location / Props"
            hint="Where or with what?"
            field={env.field}
            onProcess={env.process}
            onClear={env.clear}
          />
        </div>
      </div>

      {/* Scene description + AI Suggest */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="scene" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Scene Description
          </label>

          {/* AI Suggest button — only active when character image is uploaded */}
          <button
            type="button"
            onClick={handleAssist}
            disabled={!canAssist || assisting}
            title={canAssist ? 'Let AI write the scene from your images' : 'Upload a character reference first'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] ${
              canAssist && !assisting
                ? 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-700 cursor-not-allowed'
            }`}
          >
            {assisting ? (
              <>
                <span className="w-3 h-3 border border-zinc-600 border-t-blue-400 rounded-full animate-spin" />
                AI正在分析...
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1l1.2 3.6L11 6 7.2 7.4 6 11 4.8 7.4 1 6l3.8-1.4L6 1z" fill={canAssist ? '#60a5fa' : '#3f3f46'}/>
                </svg>
                AI 帮我写
              </>
            )}
          </button>
        </div>

        {/* Error from AI assist */}
        {assistError && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 flex-shrink-0">
              <circle cx="6" cy="6" r="5" stroke="#f87171" strokeWidth="1.2"/>
              <path d="M6 4v3M6 8.5v.5" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-red-400 leading-relaxed">{assistError}</p>
          </div>
        )}

        {/* Style note shown after AI assist */}
        {styleNote && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-500/8 border border-blue-500/20 animate-fade-in">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 flex-shrink-0">
              <circle cx="6" cy="6" r="5" stroke="#60a5fa" strokeWidth="1.2"/>
              <path d="M6 5.5v3M6 4v.5" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-blue-400 leading-relaxed">{styleNote}</p>
          </div>
        )}

        <div className="relative">
          <textarea
            id="scene"
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            rows={5}
            placeholder={
              canAssist
                ? '点击上方「AI 帮我写」，AI 会根据你上传的图片自动写场景描述。\n\n或者自己直接描述：人物做了什么、在哪里、有什么情绪...'
                : '先上传角色图片，然后让 AI 帮你写场景描述。\n\n也可以自己写：描述场景中发生了什么，镜头应该如何跟随人物。'
            }
            className={`w-full bg-zinc-900 border rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none transition-colors leading-relaxed ${
              assisting ? 'border-blue-500/50 opacity-60' : 'border-zinc-800 focus:border-blue-500'
            }`}
          />
          {assisting && (
            <div className="absolute inset-0 rounded-xl flex items-center justify-center gap-2 bg-zinc-900/60">
              <span className="w-4 h-4 border-2 border-zinc-600 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-xs text-zinc-400">AI 正在分析图片、构思场景...</span>
            </div>
          )}
        </div>
      </div>

      {/* Mood + Shot count */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="mood" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            情绪 / Mood
          </label>
          <select
            id="mood"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">让 AI 决定</option>
            {MOOD_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="shots" className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            镜头数: <span className="text-blue-400 font-mono normal-case tracking-normal">{shotCount}</span>
          </label>
          <input
            id="shots"
            type="range"
            min={3}
            max={8}
            step={1}
            value={shotCount}
            onChange={(e) => setShotCount(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer mt-2.5"
          />
        </div>
      </div>

      {/* Hint if form is empty */}
      {!canSubmit && !assisting && (
        <p className="text-xs text-zinc-600 text-center">
          {canAssist
            ? '👆 点击「AI 帮我写」，或者手动输入场景描述'
            : '上传图片后可以让 AI 帮你写场景描述'}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            正在分析...
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1" y="1" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 11h5M6.5 9v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            生成分镜脚本
          </>
        )}
      </button>
    </form>
  )
}
