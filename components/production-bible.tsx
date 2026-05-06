'use client'

import { useState } from 'react'
import Image from 'next/image'
import StoryboardFrame from './storyboard-frame'
import type { ShotSheet, StoryboardPanel, ShotType } from '@/lib/types'

interface ProductionBibleProps {
  shotSheet: ShotSheet
  panels: StoryboardPanel[]
  characterPreviewUrl?: string
  environmentPreviewUrl?: string
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

export default function ProductionBible({
  shotSheet,
  panels,
  characterPreviewUrl,
  environmentPreviewUrl,
  onGenerate,
  onReset,
}: ProductionBibleProps) {
  const [selectedCut, setSelectedCut] = useState<number | null>(null)
  const imageMap = new Map(panels.map((p) => [p.shotNumber, p.imageUrl]))
  const totalSeconds = shotSheet.shots.reduce((s, sh) => s + sh.duration, 0)

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950">

      {/* ── Top header bar ── */}
      <div className="flex items-center gap-0 px-5 py-3 bg-zinc-900 border-b border-zinc-800 flex-wrap gap-y-1">
        <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest mr-3">
          {shotSheet.scene_title}
        </span>
        <div className="flex items-center gap-4 text-[10px] text-zinc-500 flex-wrap">
          <span>Cut Count: <span className="text-zinc-300">{shotSheet.shots.length}</span></span>
          <span className="text-zinc-700">|</span>
          <span>Color Palette: <span className="text-zinc-300">{shotSheet.color_palette}</span></span>
          <span className="text-zinc-700">|</span>
          <span>Environment: <span className="text-zinc-300">{shotSheet.environment_fingerprint}</span></span>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 text-[11px] text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Re-direct
          </button>
          <button
            onClick={onGenerate}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-[11px] font-semibold transition-all active:scale-[0.98]"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 2l6 3-6 3V2z"/>
            </svg>
            Generate {totalSeconds}s Film
          </button>
        </div>
      </div>

      {/* ── Section 1 + 2: Character + Environment ── */}
      <div className="grid md:grid-cols-[2fr_3fr] divide-y md:divide-y-0 md:divide-x divide-zinc-800">

        {/* 1. Character Reference */}
        <div className="flex flex-col gap-0">
          <SectionHeader number="1" title="CHARACTER REFERENCE" />
          <div className="p-4 flex flex-col gap-3">
            {characterPreviewUrl ? (
              <div className="rounded-xl overflow-hidden border border-zinc-800 aspect-[3/4] relative bg-zinc-900">
                <Image
                  src={characterPreviewUrl}
                  alt="Character reference"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized
                />
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-zinc-800 aspect-[3/4] flex items-center justify-center">
                <p className="text-xs text-zinc-600">No character ref uploaded</p>
              </div>
            )}
            {/* Character metadata */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">Palette</p>
                <div className="flex gap-1.5">
                  {shotSheet.color_palette.split('+').slice(0, 3).map((c, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="w-5 h-5 rounded-sm bg-zinc-700 border border-zinc-600" style={{ background: COLOR_MAP[c.trim().toLowerCase()] ?? '#52525b' }}/>
                      <p className="text-[8px] text-zinc-500 text-center leading-tight">{c.trim().split(' ').slice(-1)[0]}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Character Notes</p>
                <p className="text-[10px] text-zinc-400 leading-relaxed">{shotSheet.mood}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Environment / Set Design */}
        <div className="flex flex-col gap-0">
          <SectionHeader number="2" title="ENVIRONMENT / SET DESIGN" />
          <div className="p-4 flex flex-col gap-3">
            {environmentPreviewUrl ? (
              <div className="rounded-xl overflow-hidden border border-zinc-800 aspect-video relative bg-zinc-900">
                <Image
                  src={environmentPreviewUrl}
                  alt="Environment reference"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 to-transparent flex items-end p-3">
                  <p className="text-xs text-zinc-200 leading-snug max-w-[90%]">
                    {shotSheet.environment_fingerprint}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-zinc-800 aspect-video flex items-center justify-center">
                <p className="text-xs text-zinc-600">No environment ref uploaded</p>
              </div>
            )}

            {/* Cut sequence route */}
            <div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-2">
                Shot Sequence Route — {shotSheet.shots.length} Cuts
              </p>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {shotSheet.shots.map((shot, i) => (
                  <div key={shot.number} className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setSelectedCut(selectedCut === i ? null : i)}
                      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border text-center transition-colors ${
                        selectedCut === i
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-[8px] font-mono text-zinc-500">Cut {shot.number}</span>
                      <span className={`text-[9px] font-bold px-1 rounded ${SHOT_TYPE_COLOR[shot.type] ?? 'text-zinc-400'}`}>
                        {shot.type}
                      </span>
                      <span className="text-[8px] text-zinc-600">{shot.camera_movement.split(' ').slice(0, 1)}</span>
                    </button>
                    {i < shotSheet.shots.length - 1 && (
                      <svg width="12" height="6" viewBox="0 0 12 6" fill="none" className="flex-shrink-0">
                        <path d="M0 3h10M7 1l3 2-3 2" stroke="#3f3f46" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Storyboard Cuts ── */}
      <div className="border-t border-zinc-800">
        <SectionHeader number="3" title={`STORYBOARD — ${shotSheet.shots.length} CUTS`} />
        <div className="overflow-x-auto">
          <div className="flex gap-0 divide-x divide-zinc-800" style={{ minWidth: `${shotSheet.shots.length * 220}px` }}>
            {shotSheet.shots.map((shot, i) => {
              const imageUrl = imageMap.get(shot.number)
              const isSelected = selectedCut === i
              return (
                <button
                  key={shot.number}
                  onClick={() => setSelectedCut(isSelected ? null : i)}
                  className={`flex flex-col gap-0 text-left group flex-shrink-0 transition-colors ${
                    isSelected ? 'bg-blue-500/5' : 'hover:bg-zinc-900/40'
                  }`}
                  style={{ width: 220 }}
                >
                  {/* Cut label */}
                  <div className={`px-3 py-1.5 border-b text-[10px] font-bold tracking-wider ${
                    isSelected ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'border-zinc-800 text-zinc-500'
                  }`}>
                    {shot.label}
                  </div>

                  {/* Frame image */}
                  <div className="relative aspect-video bg-zinc-900 border-b border-zinc-800">
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
                        className="w-full h-full"
                      />
                    )}
                    {imageUrl && (
                      <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[7px] font-bold bg-zinc-950/80 text-zinc-400 uppercase">4K</div>
                    )}
                  </div>

                  {/* Technical spec line */}
                  <div className="px-3 py-1.5 border-b border-zinc-800/60 bg-zinc-900/30">
                    <p className="text-[9px] text-zinc-500 font-mono leading-snug">
                      {shot.lens_feel} | {shot.duration}s | {shot.camera_movement.toUpperCase()} | {shot.type}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">{shot.emotion}</p>
                  </div>

                  {/* Dialogue + Voiceover */}
                  <div className="px-3 py-2 flex flex-col gap-1.5">
                    {shot.dialogue && (
                      <div>
                        <span className="inline-block text-[8px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded mb-1">DIALOGUE</span>
                        <p className="text-[10px] text-zinc-300 leading-snug italic">&ldquo;{shot.dialogue}&rdquo;</p>
                      </div>
                    )}
                    {shot.voiceover && (
                      <div>
                        <span className="inline-block text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded mb-1">VOICEOVER</span>
                        <p className="text-[10px] text-zinc-400 leading-snug">&ldquo;{shot.voiceover}&rdquo;</p>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Selected cut detail (expands below storyboard strip) ── */}
      {selectedCut !== null && (
        <div className="border-t border-blue-500/30 bg-blue-500/5 animate-slide-up">
          <div className="p-5 grid md:grid-cols-[1fr_1fr_1fr] gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Shot Details</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <MiniDetail label="Framing" value={shotSheet.shots[selectedCut].framing} />
                <MiniDetail label="Subject" value={shotSheet.shots[selectedCut].subject_position} />
                <MiniDetail label="Camera" value={shotSheet.shots[selectedCut].camera_movement} />
                <MiniDetail label="Lighting" value={shotSheet.shots[selectedCut].lighting_mood} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Action</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{shotSheet.shots[selectedCut].action}</p>
              {shotSheet.shots[selectedCut].cut_note && (
                <p className="text-xs text-zinc-500 italic border-t border-zinc-800 pt-2 mt-1">
                  → {shotSheet.shots[selectedCut].cut_note}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Seedance Prompt</p>
              <p className="text-xs text-zinc-300 leading-relaxed">{shotSheet.shots[selectedCut].seedance_prompt}</p>
              <CopyButton text={shotSheet.shots[selectedCut].seedance_prompt} />
            </div>
          </div>
        </div>
      )}

      {/* ── Section 4: Lighting / Mood / Style ── */}
      <div className="border-t border-zinc-800">
        <SectionHeader number="4" title="LIGHTING / MOOD / STYLE NOTES" />
        <div className="grid md:grid-cols-[1fr_auto] gap-0 divide-y md:divide-y-0 md:divide-x divide-zinc-800">

          {/* Lighting reference frames */}
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {shotSheet.shots.slice(0, 4).map((shot) => {
                const url = imageMap.get(shot.number)
                return (
                  <div key={shot.number} className="flex flex-col gap-1.5">
                    <div className="rounded-lg overflow-hidden aspect-video relative bg-zinc-900 border border-zinc-800">
                      {url ? (
                        <Image src={url} alt={shot.lighting_mood} fill className="object-cover" sizes="160px" unoptimized/>
                      ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-zinc-700"/>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide leading-tight">
                      {shot.lighting_mood.split(',')[0]}
                    </p>
                    <p className="text-[9px] text-zinc-600 leading-snug line-clamp-2">
                      {shot.lighting_mood}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mood keywords + cinematography notes */}
          <div className="p-4 flex flex-col gap-4 md:w-64">
            <div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Mood Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {(shotSheet.mood_keywords ?? shotSheet.mood.split(' ')).map((kw) => (
                  <span key={kw} className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Cinematography Notes</p>
              <ul className="flex flex-col gap-1">
                {(shotSheet.cinematography_notes ?? [shotSheet.scene_synopsis]).map((note, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-zinc-400 leading-snug">
                    <span className="w-1 h-1 rounded-full bg-zinc-600 mt-1.5 flex-shrink-0"/>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="border-t border-zinc-800 px-5 py-4 flex items-center justify-between bg-zinc-900/30 flex-wrap gap-3">
        <p className="text-xs text-zinc-500">{shotSheet.scene_synopsis}</p>
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all active:scale-[0.98]"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 2l8 4-8 4V2z"/>
          </svg>
          Generate {totalSeconds}s Film with Seedance
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800">
      <span className="text-[9px] font-bold text-zinc-600">{number}.</span>
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{title}</span>
    </div>
  )
}

function MiniDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className="text-[11px] text-zinc-300 leading-snug mt-0.5">{value}</p>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
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

// Rough palette color approximations for the swatch display
const COLOR_MAP: Record<string, string> = {
  'airy blue': '#bfdbfe',
  'sky blue': '#7dd3fc',
  'cream': '#fef3c7',
  'warm cream': '#fef3c7',
  'sun-warm cream': '#fde68a',
  'gold': '#fbbf24',
  'soft gold': '#fcd34d',
  'white': '#f4f4f5',
  'black': '#09090b',
  'warm': '#fb923c',
  'cool': '#60a5fa',
}
