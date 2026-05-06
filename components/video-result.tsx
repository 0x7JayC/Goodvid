'use client'

import type { ShotSheet } from '@/lib/types'

interface VideoResultProps {
  videoUrl: string
  shotSheet: ShotSheet
  onReset: () => void
}

export default function VideoResult({ videoUrl, shotSheet, onReset }: VideoResultProps) {
  return (
    <div className="flex flex-col gap-8 animate-slide-up">

      {/* Success header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l4 4 6-6" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Film ready</p>
          <p className="text-xs text-zinc-500">
            &quot;{shotSheet.scene_title}&quot; · {shotSheet.shots.reduce((s, shot) => s + shot.duration, 0)}s
          </p>
        </div>
      </div>

      {/* Video player — full width, 16:9 */}
      <div className="rounded-2xl overflow-hidden border border-zinc-800 aspect-video bg-zinc-950 w-full">
        <video
          src={videoUrl}
          className="w-full h-full object-contain"
          controls
          autoPlay
          loop
          playsInline
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <a
          href={videoUrl}
          download={`goodvid-${shotSheet.scene_title.toLowerCase().replace(/\s+/g, '-')}.mp4`}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v8M3.5 6.5l3 3 3-3M1 11h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Download MP4
        </a>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6a5 5 0 1010 0M1 6V2m0 4H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Direct a new scene
        </button>
      </div>

      {/* Shot sheet summary */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col gap-3">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Shot breakdown</p>
        <div className="flex flex-wrap gap-2">
          {shotSheet.shots.map((shot) => (
            <div
              key={shot.number}
              className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col gap-0.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-zinc-600">{shot.number}</span>
                <span className="text-[10px] font-bold text-zinc-400">{shot.type}</span>
                <span className="text-[10px] font-mono text-zinc-600">{shot.duration}s</span>
              </div>
              <p className="text-[10px] text-zinc-500 max-w-[16ch] leading-snug">{shot.emotion}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
