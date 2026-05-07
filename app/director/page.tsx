'use client'

import { useState } from 'react'
import ShotSheetForm from '@/components/shot-sheet-form'
import BibleViewer from '@/components/bible-viewer'
import type { DirectorFormSubmission, ShotSheet } from '@/lib/types'

type Stage =
  | { name: 'form' }
  | { name: 'analyzing';  step: 'director' | 'bible' }
  | { name: 'review';     shotSheet: ShotSheet; bibleImageUrl: string; bibleError?: string }
  | { name: 'error';      message: string }

const STEP_LABELS = ['References', 'Bible']

function stepIndex(stage: Stage): number {
  if (stage.name === 'form' || stage.name === 'analyzing') return 0
  return 1
}

export default function DirectorPage() {
  const [stage, setStage] = useState<Stage>({ name: 'form' })

  const handleAnalyze = async (data: DirectorFormSubmission) => {

    // ── Phase A: Director LLM → shot sheet ────────────────────────────────
    setStage({ name: 'analyzing', step: 'director' })

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

    // ── Phase B: Production bible image ───────────────────────────────────
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
        console.warn('Bible image gen failed:', msg)
      }
    } catch (err) {
      bibleError = String(err)
      console.warn('Bible gen error:', err)
    }

    setStage({ name: 'review', shotSheet, bibleImageUrl, bibleError })
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
            Reference → Production Bible.
          </h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEP_LABELS.map((label, i) => {
            const done   = i < idx
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
              { step: '02', label: 'Production Bible', desc: 'GPT-5.4-image-2 renders the full storyboard document' },
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
            onGenerate={() => {/* video generation disabled for now */}}
            onReset={() => setStage({ name: 'form' })}
            hideGenerateButton
          />
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 p-6 max-w-xl">
            <div className="flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
                <circle cx="9" cy="9" r="7.5" stroke="#ef4444" strokeWidth="1.3"/>
                <path d="M9 5.5V9.5M9 12v.5" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-zinc-200">Bible image generation failed</p>
                <p className="text-xs text-zinc-500 mt-1">Shot sheet was created successfully. The image render failed.</p>
                {stage.bibleError && (
                  <p className="text-xs text-red-400 font-mono mt-2 break-all">{stage.bibleError}</p>
                )}
              </div>
            </div>
            <p className="text-sm text-zinc-400 italic border-t border-zinc-800 pt-4">
              {stage.shotSheet.scene_synopsis}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStage({ name: 'form' })}
                className="px-4 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                Try again
              </button>
            </div>
          </div>
        )
      )}

      {/* ── Error ── */}
      {stage.name === 'error' && (
        <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-5 flex flex-col gap-4 max-w-xl">
          <p className="text-sm font-medium text-red-400">Something went wrong</p>
          <p className="text-sm text-zinc-400 font-mono text-xs bg-zinc-900 rounded-lg p-3 leading-relaxed break-all">
            {stage.message}
          </p>
          <button onClick={() => setStage({ name: 'form' })}
            className="self-start px-4 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
            Start over
          </button>
        </div>
      )}
    </div>
  )
}

function AnalyzingState({ step }: { step: 'director' | 'bible' }) {
  const isDirector = step === 'director'
  const label = isDirector ? 'Directing your scene...' : 'Rendering production bible...'
  const sub = isDirector
    ? 'Vision LLM is reading references and writing the shot sheet'
    : 'GPT-5.4-image-2 is composing the full storyboard document'
  const lines = isDirector
    ? ['Reading reference images...', 'Planning shot coverage...', 'Writing dialogue + voiceover...', 'Finalising Seedance prompts...']
    : ['Rendering character section...', 'Drawing floor plan...', 'Rendering storyboard frames...', 'Composing lighting notes...']

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-800"/>
        <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin"/>
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500 mt-1">{sub}</p>
        {!isDirector && <p className="text-xs text-zinc-600 mt-2">This takes 30–60 seconds for the full document.</p>}
      </div>
      <div className="flex flex-col gap-2 w-72">
        {lines.map((line, i) => (
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
