'use client'

import Image from 'next/image'
import type { ShotSheet } from '@/lib/types'

interface BibleViewerProps {
  bibleImageUrl: string
  shotSheet: ShotSheet
  onGenerate: () => void
  onReset: () => void
  hideGenerateButton?: boolean
}

export default function BibleViewer({
  bibleImageUrl,
  shotSheet,
  onGenerate,
  onReset,
  hideGenerateButton = false,
}: BibleViewerProps) {
  const totalSeconds = shotSheet.shots.reduce((n, s) => n + s.duration, 0)

  return (
    <div className="flex flex-col gap-6 animate-slide-up">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Production Bible</p>
          <h2 className="text-xl font-bold tracking-tight text-zinc-50">{shotSheet.scene_title}</h2>
          <p className="text-sm text-zinc-400 mt-1">{shotSheet.scene_synopsis}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onReset}
            className="px-3 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Re-direct
          </button>
          <a
            href={bibleImageUrl}
            download={`production-bible-${shotSheet.scene_title.toLowerCase().replace(/\s+/g, '-')}.png`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1v6M3 5.5l2.5 2.5L8 5.5M1 9h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download Bible
          </a>
          {!hideGenerateButton && (
            <button
              onClick={onGenerate}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all active:scale-[0.98]"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
                <path d="M2 2l7 3.5L2 9V2z"/>
              </svg>
              Generate {totalSeconds}s Film
            </button>
          )}
        </div>
      </div>

      {/* Production bible image — full width, high resolution */}
      <div className="rounded-2xl overflow-hidden border border-zinc-800 w-full relative bg-zinc-900">
        <Image
          src={bibleImageUrl}
          alt={`Production Bible — ${shotSheet.scene_title}`}
          width={1792}
          height={1024}
          className="w-full h-auto"
          unoptimized
          priority
        />
      </div>

      {/* Metadata strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetaCard label="Cuts" value={String(shotSheet.shots.length)} />
        <MetaCard label="Duration" value={`${totalSeconds}s`} />
        <MetaCard label="Mood" value={shotSheet.mood} />
        <MetaCard label="Palette" value={shotSheet.color_palette} />
      </div>

      {/* Shot order summary */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-zinc-600 uppercase tracking-wider">Sequence</p>
        <div className="flex flex-wrap gap-2">
          {shotSheet.shots.map((shot) => (
            <div key={shot.number} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] font-mono text-zinc-600">{shot.number}</span>
              <span className="text-xs font-medium text-zinc-300">{shot.type}</span>
              <span className="text-[10px] text-zinc-500">{shot.lens_feel.split(',')[0]}</span>
              <span className="text-[10px] font-mono text-zinc-600">{shot.duration}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA — hidden when video generation is disabled */}
      {!hideGenerateButton && (
        <div className="flex justify-end">
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all active:scale-[0.98]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 2l8 4-8 4V2z"/>
            </svg>
            Generate {totalSeconds}s Film with Seedance
          </button>
        </div>
      )}
    </div>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
      <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-zinc-200 font-medium leading-snug truncate">{value}</p>
    </div>
  )
}
