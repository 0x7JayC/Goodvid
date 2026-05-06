'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Shot } from '@/lib/types'

const SHOT_TYPE_LABEL: Record<string, string> = {
  ECU: 'Extreme Close-Up',
  CU: 'Close-Up',
  MCU: 'Medium Close-Up',
  MS: 'Medium Shot',
  WS: 'Wide Shot',
  EWS: 'Extreme Wide',
  OTS: 'Over Shoulder',
  POV: 'Point of View',
  INSERT: 'Insert',
}

const SHOT_TYPE_COLOR: Record<string, string> = {
  ECU: 'bg-red-500/15 text-red-400 border-red-500/20',
  CU: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  MCU: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  MS: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  WS: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  EWS: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  OTS: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  POV: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  INSERT: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
}

interface ShotCardProps {
  shot: Shot
  index: number
  isLast: boolean
}

export default function ShotCard({ shot, index, isLast }: ShotCardProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const typeColor = SHOT_TYPE_COLOR[shot.type] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(shot.seedance_prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openInGenerate = () => {
    const params = new URLSearchParams({
      prompt: shot.seedance_prompt,
      duration: String(shot.duration),
      aspectRatio: shot.aspect_ratio,
    })
    router.push(`/generate?${params.toString()}`)
  }

  return (
    <div className="animate-slide-up" style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both', opacity: 0 }}>
      <div className="grid md:grid-cols-[2rem_1fr] gap-4">

        {/* Timeline column */}
        <div className="hidden md:flex flex-col items-center gap-0 pt-1">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-mono text-zinc-400">{shot.number}</span>
          </div>
          {!isLast && <div className="w-px flex-1 min-h-[2rem] bg-zinc-800 mt-2" />}
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors">

          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <span className={`md:hidden w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono bg-zinc-800 border border-zinc-700 text-zinc-400`}>
                {shot.number}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{shot.label}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{shot.emotion}</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${typeColor}`}>
              {shot.type}
            </span>
          </div>

          {/* Shot details grid */}
          <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <Detail label="Framing" value={shot.framing} />
            <Detail label="Subject" value={shot.subject_position} />
            <Detail label="Camera" value={shot.camera_movement} />
            <Detail label="Lens" value={shot.lens_feel} />
            <Detail label="Light" value={shot.lighting_mood} />
            <Detail
              label="Duration"
              value={`${shot.duration}s · ${shot.aspect_ratio}`}
              mono
            />
          </div>

          {/* What happens */}
          <div className="px-5 pb-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Action</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{shot.action}</p>
          </div>

          {/* Seedance prompt */}
          <div className="mx-5 mb-4 rounded-xl bg-zinc-950 border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Seedance Prompt
              </p>
              <button
                onClick={copyPrompt}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                {copied ? (
                  <>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M1 5.5L4 8.5l6-6" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M3.5 7.5H2a1 1 0 01-1-1V2a1 1 0 011-1h4.5a1 1 0 011 1v1.5" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{shot.seedance_prompt}</p>
          </div>

          {/* Cut note + CTA */}
          <div className="px-5 pb-5 flex items-center justify-between gap-4">
            {!isLast && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6h10M7 2l4 4-4 4" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{shot.cut_note}</span>
              </div>
            )}
            <button
              onClick={openInGenerate}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold transition-all active:scale-[0.98]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 6l4-4v2.5h6v3H5V10L1 6z" fill="currentColor"/>
              </svg>
              Generate in Seedance
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className={`text-xs text-zinc-300 leading-snug ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
