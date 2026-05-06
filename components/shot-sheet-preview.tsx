'use client'

import { useState } from 'react'
import Image from 'next/image'
import StoryboardFrame from './storyboard-frame'
import type { Shot, ShotSheet, ShotType, StoryboardPanel } from '@/lib/types'

interface ShotSheetPreviewProps {
  shotSheet: ShotSheet
  panels: StoryboardPanel[]           // AI-rendered 4K images (may be partial)
  onGenerate: () => void
  onReset: () => void
}

const SHOT_TYPE_COLOR: Record<string, string> = {
  ECU: 'bg-red-500/20 text-red-400',
  CU: 'bg-orange-500/20 text-orange-400',
  MCU: 'bg-amber-500/20 text-amber-400',
  MS: 'bg-emerald-500/20 text-emerald-400',
  WS: 'bg-blue-500/20 text-blue-400',
  EWS: 'bg-violet-500/20 text-violet-400',
  OTS: 'bg-cyan-500/20 text-cyan-400',
  POV: 'bg-pink-500/20 text-pink-400',
  INSERT: 'bg-zinc-500/20 text-zinc-400',
}

export default function ShotSheetPreview({
  shotSheet,
  panels,
  onGenerate,
  onReset,
}: ShotSheetPreviewProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const totalSeconds = shotSheet.shots.reduce((s, shot) => s + shot.duration, 0)
  const selectedShot = selected !== null ? shotSheet.shots[selected] : null

  const imageMap = new Map(panels.map((p) => [p.shotNumber, p.imageUrl]))

  return (
    <div className="flex flex-col gap-8">

      {/* Scene header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Shot Sheet</p>
          <h2 className="text-xl font-bold tracking-tight text-zinc-50">{shotSheet.scene_title}</h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-[55ch] leading-relaxed">{shotSheet.scene_synopsis}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
            <span>{shotSheet.mood}</span>
            <span>·</span>
            <span>{shotSheet.color_palette}</span>
          </div>
        </div>
        <div className="flex gap-2 items-start flex-shrink-0">
          <button
            onClick={onReset}
            className="px-3 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Re-direct
          </button>
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all active:scale-[0.98]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 2l8 4-8 4V2z"/>
            </svg>
            Generate {totalSeconds}s Film
          </button>
        </div>
      </div>

      {/* ── 4K Storyboard filmstrip ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Visual Storyboard · {shotSheet.shots.length} shots
          </p>
          {panels.length < shotSheet.shots.length && panels.length > 0 && (
            <p className="text-xs text-zinc-600">
              {panels.length}/{shotSheet.shots.length} images rendered
            </p>
          )}
        </div>

        {/* Horizontal filmstrip */}
        <div className="overflow-x-auto pb-4 -mx-6 px-6">
          <div className="flex gap-3" style={{ width: 'max-content' }}>
            {shotSheet.shots.map((shot, i) => {
              const imageUrl = imageMap.get(shot.number)
              return (
                <FilmstripPanel
                  key={shot.number}
                  shot={shot}
                  index={i}
                  imageUrl={imageUrl}
                  isSelected={selected === i}
                  isLast={i === shotSheet.shots.length - 1}
                  onClick={() => setSelected(selected === i ? null : i)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Selected shot detail ── */}
      {selectedShot && selected !== null && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${SHOT_TYPE_COLOR[selectedShot.type] ?? 'bg-zinc-700 text-zinc-300'}`}>
                {selectedShot.type}
              </span>
              <h3 className="text-sm font-semibold text-zinc-100">{selectedShot.label}</h3>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1L1 9" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="grid md:grid-cols-[1.2fr_1fr] gap-0 divide-y md:divide-y-0 md:divide-x divide-zinc-800">

            {/* Left: full 4K frame + details */}
            <div className="flex flex-col gap-4 p-5">
              {/* Large frame preview */}
              <div className="rounded-xl overflow-hidden border border-zinc-800 aspect-video bg-zinc-950 relative">
                {imageMap.get(selectedShot.number) ? (
                  <Image
                    src={imageMap.get(selectedShot.number)!}
                    alt={selectedShot.label}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    unoptimized
                  />
                ) : (
                  <StoryboardFrame
                    shotType={selectedShot.type as ShotType}
                    cameraMovement={selectedShot.camera_movement}
                    emotion={selectedShot.emotion}
                    className="w-full h-full"
                  />
                )}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${SHOT_TYPE_COLOR[selectedShot.type] ?? 'bg-zinc-700 text-zinc-300'}`}>
                    {selectedShot.type}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-950/80 text-zinc-400 font-mono">
                    {selectedShot.duration}s
                  </span>
                </div>
              </div>

              {/* Shot specs grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Detail label="Framing" value={selectedShot.framing} />
                <Detail label="Subject" value={selectedShot.subject_position} />
                <Detail label="Camera" value={selectedShot.camera_movement} />
                <Detail label="Lens" value={selectedShot.lens_feel} />
                <Detail label="Lighting" value={selectedShot.lighting_mood} />
                <Detail label="Emotion" value={selectedShot.emotion} />
              </div>

              <div>
                <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Action</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{selectedShot.action}</p>
              </div>

              {selected < shotSheet.shots.length - 1 && (
                <div className="flex items-start gap-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 mt-0.5">
                    <path d="M1 6h10M7 2l4 4-4 4" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-xs text-zinc-500 italic">{selectedShot.cut_note}</p>
                </div>
              )}
            </div>

            {/* Right: Seedance prompt */}
            <div className="p-5 flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Seedance Prompt</p>
              <p className="text-sm text-zinc-200 leading-relaxed flex-1">{selectedShot.seedance_prompt}</p>
              <CopyButton text={selectedShot.seedance_prompt} />
            </div>
          </div>
        </div>
      )}

      {/* Sequence logic table */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Sequence</p>
        <div className="rounded-xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800/60">
          {shotSheet.shots.map((shot, i) => (
            <button
              key={i}
              onClick={() => setSelected(selected === i ? null : i)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-900/60 transition-colors text-left group"
            >
              <span className="w-5 text-xs font-mono text-zinc-600 shrink-0">{shot.number}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${SHOT_TYPE_COLOR[shot.type] ?? 'bg-zinc-700 text-zinc-300'}`}>
                {shot.type}
              </span>
              {/* Thumbnail */}
              {imageMap.get(shot.number) ? (
                <div className="w-12 h-7 rounded overflow-hidden border border-zinc-800 flex-shrink-0 relative">
                  <Image src={imageMap.get(shot.number)!} alt="" fill className="object-cover" sizes="48px" unoptimized/>
                </div>
              ) : null}
              <span className="text-xs text-zinc-300 flex-1 truncate">{shot.action}</span>
              <span className="text-xs text-zinc-600 shrink-0 hidden sm:block">{shot.emotion}</span>
              <span className="text-xs font-mono text-zinc-600 shrink-0">{shot.duration}s</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-zinc-700 group-hover:text-zinc-500 transition-colors">
                <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all active:scale-[0.98]"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
            <path d="M2 2l9 4.5-9 4.5V2z"/>
          </svg>
          Generate {totalSeconds}s Film with Seedance
        </button>
      </div>
    </div>
  )
}

// ─── Filmstrip Panel ──────────────────────────────────────────────────────────

function FilmstripPanel({
  shot,
  index,
  imageUrl,
  isSelected,
  isLast,
  onClick,
}: {
  shot: Shot
  index: number
  imageUrl?: string
  isSelected: boolean
  isLast: boolean
  onClick: () => void
}) {
  return (
    <div className="flex items-start gap-2">
      <button onClick={onClick} className="flex flex-col gap-2 group" style={{ width: 220 }}>
        {/* Frame */}
        <div
          className={`rounded-xl overflow-hidden border-2 transition-all relative ${
            isSelected
              ? 'border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
              : 'border-zinc-800 group-hover:border-zinc-600'
          }`}
          style={{ aspectRatio: '16/9' }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={shot.label}
              fill
              className="object-cover"
              sizes="220px"
              unoptimized
            />
          ) : (
            <StoryboardFrame
              shotType={shot.type as ShotType}
              cameraMovement={shot.camera_movement}
              emotion={shot.emotion}
            />
          )}

          {/* Overlay badges */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${SHOT_TYPE_COLOR[shot.type] ?? 'bg-zinc-700 text-zinc-300'}`}>
              {shot.type}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-950/80 text-zinc-400">
              {shot.duration}s
            </span>
          </div>

          {/* 4K badge if rendered */}
          {imageUrl && (
            <div className="absolute bottom-2 right-2">
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-zinc-950/80 text-zinc-400 uppercase tracking-wider">
                4K
              </span>
            </div>
          )}
        </div>

        <div className="px-1">
          <p className="text-[11px] text-zinc-300 font-medium leading-snug line-clamp-1">
            {shot.label.replace(/^Shot \d+ — /, '')}
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5 leading-snug line-clamp-1">
            {shot.emotion}
          </p>
        </div>
      </button>

      {!isLast && (
        <div className="flex items-center pt-6 flex-shrink-0">
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path d="M1 5h11M8 1.5l3.5 3.5L8 8.5" stroke="#3f3f46" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs text-zinc-300 leading-snug">{value}</p>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button
      onClick={copy}
      className={`self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        copied ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
      }`}
    >
      {copied ? 'Copied' : 'Copy prompt'}
    </button>
  )
}
