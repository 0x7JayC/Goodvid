'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ImageUpload from './image-upload'
import type { GenerationType, AspectRatio } from '@/lib/types'

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

interface GenerateState {
  status: 'idle' | 'submitting' | 'polling' | 'done' | 'error'
  message: string
  videoUrl?: string
  generationId?: string
}

interface GenerateFormProps {
  initialPrompt?: string
  initialDuration?: number
  initialAspectRatio?: AspectRatio
}

export default function GenerateForm({
  initialPrompt = '',
  initialDuration = 5,
  initialAspectRatio = '16:9',
}: GenerateFormProps) {
  const router = useRouter()
  const [tab, setTab] = useState<GenerationType>('text-to-video')
  const [prompt, setPrompt] = useState(initialPrompt)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialAspectRatio)
  const [duration, setDuration] = useState(initialDuration)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [state, setState] = useState<GenerateState>({ status: 'idle', message: '' })

  const handleImageUpload = useCallback(
    (base64: string, mimeType: string, preview: string) => {
      setImageBase64(base64)
      setImageMimeType(mimeType)
      setImagePreview(preview)
    },
    []
  )

  const handleImageClear = useCallback(() => {
    setImageBase64(null)
    setImageMimeType(null)
    setImagePreview(null)
  }, [])

  const pollUntilDone = useCallback(
    async (taskId: string, generationId: string) => {
      const deadline = Date.now() + POLL_TIMEOUT_MS

      const tick = async (): Promise<void> => {
        if (Date.now() > deadline) {
          setState({ status: 'error', message: 'Timed out after 5 minutes. Check Gallery for result.' })
          return
        }

        try {
          const res = await fetch(`/api/poll/${taskId}`)
          const data = await res.json()

          if (data.status === 'completed') {
            setState({
              status: 'done',
              message: 'Video ready.',
              videoUrl: data.videoUrl,
              generationId,
            })
            router.refresh()
            return
          }

          if (data.status === 'failed') {
            setState({ status: 'error', message: data.error ?? 'Generation failed.' })
            return
          }

          // Still pending/processing — schedule next poll
          setState({
            status: 'polling',
            message: data.status === 'processing' ? 'Generating your video...' : 'Queued, waiting to start...',
          })

          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
          return tick()
        } catch (err) {
          setState({ status: 'error', message: `Poll error: ${String(err)}` })
        }
      }

      await tick()
    },
    [router]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prompt.trim()) return

    setState({ status: 'submitting', message: 'Submitting job...' })

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: tab,
          prompt: prompt.trim(),
          imageBase64: imageBase64 ?? undefined,
          imageMimeType: imageMimeType ?? undefined,
          duration,
          aspectRatio,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setState({ status: 'error', message: data.error ?? 'Submission failed.' })
        return
      }

      setState({ status: 'polling', message: 'Job submitted, waiting...' })
      await pollUntilDone(data.taskId, data.generationId)
    } catch (err) {
      setState({ status: 'error', message: `Error: ${String(err)}` })
    }
  }

  const isRunning = state.status === 'submitting' || state.status === 'polling'

  return (
    <div className="grid md:grid-cols-[1fr_1.2fr] gap-8 items-start">
      {/* ── Left: Controls ── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Type tabs */}
        <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
          {(['text-to-video', 'image-to-video'] as GenerationType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                tab === t
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t === 'text-to-video' ? 'Text to Video' : 'Image to Video'}
            </button>
          ))}
        </div>

        {/* Image upload (only for image-to-video) */}
        {tab === 'image-to-video' && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">Input Image</label>
            <ImageUpload
              onUpload={handleImageUpload}
              onClear={handleImageClear}
              previewUrl={imagePreview}
            />
          </div>
        )}

        {/* Prompt */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="prompt" className="text-sm font-medium text-zinc-300">Prompt</label>
            {initialPrompt && (
              <span className="flex items-center gap-1.5 text-xs text-blue-400">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M1 9c0-2.21 1.79-3 4-3s4 .79 4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                From Director
              </span>
            )}
          </div>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              tab === 'text-to-video'
                ? 'A drone flies over golden wheat fields at sunset, cinematic slow motion...'
                : 'Animate this image: gentle camera pan, leaves rustling in the breeze...'
            }
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-blue-500 transition-colors"
          />
          <p className="text-xs text-zinc-500">{prompt.length}/500 characters</p>
        </div>

        {/* Settings row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="aspect" className="text-sm font-medium text-zinc-300">
              Aspect Ratio
            </label>
            <select
              id="aspect"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="16:9">16:9 — Landscape</option>
              <option value="9:16">9:16 — Portrait</option>
              <option value="1:1">1:1 — Square</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="duration" className="text-sm font-medium text-zinc-300">
              Duration: <span className="text-blue-400 font-mono">{duration}s</span>
            </label>
            <input
              id="duration"
              type="range"
              min={3}
              max={10}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer mt-2"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isRunning || !prompt.trim() || (tab === 'image-to-video' && !imageBase64)}
          className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {state.status === 'submitting' ? 'Submitting...' : 'Generating...'}
            </>
          ) : (
            'Generate Video'
          )}
        </button>

        {/* Status message */}
        {state.message && (
          <p
            className={`text-sm text-center ${
              state.status === 'error' ? 'text-red-400' : 'text-zinc-400'
            }`}
          >
            {state.message}
          </p>
        )}
      </form>

      {/* ── Right: Output Preview ── */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-zinc-400">Output</h2>

        {state.status === 'done' && state.videoUrl ? (
          <div className="flex flex-col gap-3 animate-slide-up">
            <div className="rounded-xl overflow-hidden border border-zinc-800 aspect-video bg-zinc-900">
              <video
                src={state.videoUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                loop
                playsInline
              />
            </div>
            <div className="flex gap-2">
              <a
                href={state.videoUrl}
                download
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-sm text-zinc-200 font-medium text-center hover:bg-zinc-800 transition-colors"
              >
                Download
              </a>
              <button
                onClick={() => {
                  setState({ status: 'idle', message: '' })
                  setPrompt('')
                  handleImageClear()
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-sm text-blue-400 font-medium hover:bg-blue-500/20 transition-colors"
              >
                Generate Another
              </button>
            </div>
          </div>
        ) : isRunning ? (
          <div className="rounded-xl border border-zinc-800 aspect-video bg-zinc-900 flex flex-col items-center justify-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-zinc-700" />
              <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-300 font-medium">
                {state.status === 'submitting' ? 'Submitting job...' : 'Generating video...'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">This usually takes 30–90 seconds</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-zinc-800 aspect-video flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M2 14l5-5 4 4 3-3 6 6" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2l4 4-4 4" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm text-zinc-600">Your generated video will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}
