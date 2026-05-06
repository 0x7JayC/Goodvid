'use client'

import { useState } from 'react'
import ShotSheetForm from '@/components/shot-sheet-form'
import BibleViewer from '@/components/bible-viewer'
import VideoResult from '@/components/video-result'
import type { DirectorFormSubmission, ShotSheet } from '@/lib/types'

interface RefImages {
  charBase64?: string
  charMime?: string
  charPreview?: string
  envBase64?: string
  envMime?: string
  envPreview?: string
}

type Stage =
  | { name: 'form' }
  | { name: 'analyzing';   step: 'director' | 'bible' }
  | { name: 'review';      shotSheet: ShotSheet; bibleImageUrl: string; bibleError?: string }
  | { name: 'generating';  shotSheet: ShotSheet }
  | { name: 'done';        videoUrl: string; shotSheet: ShotSheet }
  | { name: 'error';       message: string }

const STEP_LABELS = ['References', 'Bible', 'Film']

function stepIndex(stage: Stage): number {
  if (stage.name === 'form' || stage.name === 'analyzing') return 0
  if (stage.name === 'review') return 1
  return 2
}

const POLL_INTERVAL = 3000
const POLL_TIMEOUT = 5 * 60 * 1000

async function pollVideoReady(taskId: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT
  const tick = async (): Promise<string> => {
    if (Date.now() > deadline) throw new Error('Timed out after 5 minutes')
    const res = await fetch(`/api/poll/${taskId}`)
    const data = await res.json()
    if (data.status === 'completed' && data.videoUrl) return data.videoUrl
    if (data.status === 'failed') throw new Error(data.error ?? 'Generation failed')
    await new Promise((r) => setTimeout(r, POLL_INTERVAL))
    return tick()
  }
  return tick()
}

function compileMasterPrompt(shotSheet: ShotSheet): string {
  const shots = shotSheet.shots.map((s) => s.seedance_prompt).join('. Then, ')
  return [
    shotSheet.scene_synopsis,
    `${shotSheet.mood} atmosphere, ${shotSheet.color_palette} color palette.`,
    `The sequence: ${shots}.`,
    'Cinematic quality, seamless motion, 15 seconds.',
  ].join(' ')
}

export default function DirectorPage() {
  const [stage, setStage] = useState<Stage>({ name: 'form' })
  const [refs, setRefs] = useState<RefImages>({})

  // ── Step 1: Director LLM → shot sheet ──────────────────────────────────────
  const handleAnalyze = async (data: DirectorFormSubmission) => {
    setRefs({
      charBase64: data.character_image_base64,
      charMime: data.character_image_mime,
      charPreview: data._characterPreviewUrl,
      envBase64: data.environment_image_base64,
      envMime: data.environment_image_mime,
      envPreview: data._environmentPreviewUrl,
    })

    setStage({ name: 'analyzing', step: 'director' })

    // Phase A — Shot sheet from director LLM
    let shotSheet: ShotSheet
    try {
      const { _characterPreviewUrl, _environmentPreviewUrl, ...apiData } = data
      void _characterPreviewUrl; void _environmentPreviewUrl

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90_000)
      let res: Response
      try {
        res = await fetch('/api/director', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeout)
      }
      if (!res.ok) {
        const text = await res.text()
        let msg = 'Director analysis failed'
        try { msg = JSON.parse(text).error ?? msg } catch { msg = text || msg }
        throw new Error(msg)
      }
      const json = await res.json()
      shotSheet = json.shotSheet
    } catch (err) {
      setStage({ name: 'error', message: String(err) })
      return
    }

    // Phase B — Generate full production bible image
    setStage({ name: 'analyzing', step: 'bible' })

    let bibleImageUrl = ''
    let bibleError = ''
    try {
      const res = await fetch('/api/bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotSheet }),
      })
      if (res.ok) {
        const json = await res.json()
        bibleImageUrl = json.bibleImageUrl ?? ''
      } else {
        const text = await res.text()
        let msg = 'Bible image gen failed'
        try { msg = JSON.parse(text).error ?? msg } catch { msg = text || msg }
        bibleError = msg
        console.warn('Bible image gen failed (non-fatal):', msg)
      }
    } catch (err) {
      bibleError = String(err)
      console.warn('Bible gen error (non-fatal):', err)
    }

    setStage({ name: 'review', shotSheet, bibleImageUrl, bibleError })
  }

  // ── Step 2: Generate 15s Seedance film ─────────────────────────────────────
  const handleGenerate = async (shotSheet: ShotSheet) => {
    setStage({ name: 'generating', shotSheet })
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text-to-video',
          prompt: compileMasterPrompt(shotSheet),
          duration: 15,
          aspectRatio: shotSheet.shots[0]?.aspect_ratio ?? '16:9',
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        let msg = 'Generation failed'
        try { msg = JSON.parse(text).error ?? msg } catch { msg = text || msg }
        throw new Error(msg)
      }
      const data = await res.json()
      const videoUrl = await pollVideoReady(data.taskId)
      setStage({ name: 'done', videoUrl, shotSheet })
    } catch (err) {
      setStage({ name: 'error', message: String(err) })
    }
  }

  const idx = stepIndex(stage)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="11" height="8" rx="1.5" stroke="#71717a" strokeWidth="1.2"/>
                <path d="M4 11h5M6.5 9v2" stroke="#71717a" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Director</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Reference → Production Bible → Film.
          </h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEP_LABELS.map((label, i) => {
            const done = i < idx
            const active = i === idx
            return (
              <div key={label} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  active ? 'bg-blue-500/15 text-blue-400' : done ? 'text-zinc-400' : 'text-zinc-700'
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    done ? 'bg-zinc-700 text-zinc-300' : active ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-600'
                  }`}>
                    {done ? (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2.5 2.5L7 1.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : i + 1}
                  </span>
                  {label}
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`w-8 h-px mx-1 ${i < idx ? 'bg-zinc-600' : 'bg-zinc-800'}`}/>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Form ── */}
      {stage.name === 'form' && (
        <div className="grid md:grid-cols-[1fr_260px] gap-10 items-start">
          <ShotSheetForm onGenerate={handleAnalyze} loading={false} />
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex-col gap-3 hidden md:flex">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Pipeline</p>
            {[
              { step: '01', label: 'Director LLM', desc: 'Shot sheet, dialogue, voiceover, sound notes' },
              { step: '02', label: 'Production Bible', desc: 'GPT-5.4-image-2 renders the full document' },
              { step: '03', label: 'Seedance Film', desc: '15s video generated from your shot sheet' },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="text-[10px] font-mono text-zinc-700 mt-0.5">{step}</span>
                <div>
                  <p className="text-xs font-medium text-zinc-300">{label}</p>
                  <p className="text-xs text-zinc-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Analyzing ── */}
      {stage.name === 'analyzing' && <AnalyzingState step={stage.step} />}

      {/* ── Bible review ── */}
      {stage.name === 'review' && (
        stage.bibleImageUrl ? (
          <BibleViewer
            bibleImageUrl={stage.bibleImageUrl}
            shotSheet={stage.shotSheet}
            onGenerate={() => handleGenerate(stage.shotSheet)}
            onReset={() => setStage({ name: 'form' })}
          />
        ) : (
          /* Fallback: bible image gen failed — show minimal review with generate button */
          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 p-6">
            <p className="text-sm text-zinc-400">
              Production bible image could not be rendered. Shot sheet is ready — you can still generate the film.
            </p>
            {stage.bibleError && (
              <p className="text-xs text-red-400 font-mono break-all">{stage.bibleError}</p>
            )}
            <p className="text-xs text-zinc-500">{stage.shotSheet.scene_synopsis}</p>
            <div className="flex gap-3">
              <button onClick={() => setStage({ name: 'form' })} className="px-4 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                Re-direct
              </button>
              <button onClick={() => handleGenerate(stage.shotSheet)} className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all">
                Generate 15s Film Anyway
              </button>
            </div>
          </div>
        )
      )}

      {/* ── Generating ── */}
      {stage.name === 'generating' && <GeneratingState title={stage.shotSheet.scene_title} />}

      {/* ── Done ── */}
      {stage.name === 'done' && (
        <VideoResult
          videoUrl={stage.videoUrl}
          shotSheet={stage.shotSheet}
          onReset={() => setStage({ name: 'form' })}
        />
      )}

      {/* ── Error ── */}
      {stage.name === 'error' && (
        <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-5 flex flex-col gap-4 max-w-xl">
          <p className="text-sm font-medium text-red-400">Something went wrong</p>
          <p className="text-sm text-zinc-400">{stage.message}</p>
          <button onClick={() => setStage({ name: 'form' })} className="self-start px-4 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
            Start over
          </button>
        </div>
      )}
    </div>
  )
}

function AnalyzingState({ step }: { step: 'director' | 'bible' }) {
  const isDirector = step === 'director'
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-28">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-800"/>
        <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin"/>
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-medium text-zinc-200">
          {isDirector ? 'Directing your scene...' : 'Rendering production bible...'}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          {isDirector
            ? 'Analyzing references, writing shot sheet, dialogue, and voiceover'
            : 'GPT-5.4-image-2 is rendering all 4 sections — character, environment, storyboard, lighting'}
        </p>
        {!isDirector && (
          <p className="text-xs text-zinc-600 mt-2">This takes 30–60 seconds for the full document.</p>
        )}
      </div>
      <div className="flex flex-col gap-2 w-72">
        {(isDirector
          ? ['Reading references...', 'Planning shots...', 'Writing dialogue...', 'Finalising prompts...']
          : ['Rendering character section...', 'Drawing floor plan...', 'Rendering storyboard frames...', 'Composing lighting notes...']
        ).map((line, i) => (
          <div key={line} className="flex items-center gap-2.5 animate-fade-in"
            style={{ animationDelay: `${i * 700}ms`, animationFillMode: 'both', opacity: 0 }}>
            <div className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0"/>
            <p className="text-xs text-zinc-500">{line}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function GeneratingState({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-28">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-800"/>
        <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin"/>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-200">Generating your 15-second film...</p>
        <p className="text-xs text-zinc-500 mt-1">Seedance is rendering &quot;{title}&quot;</p>
        <p className="text-xs text-zinc-600 mt-2">Usually takes 60–120 seconds.</p>
      </div>
    </div>
  )
}
