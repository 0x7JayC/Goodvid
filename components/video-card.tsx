'use client'

import { useState } from 'react'
import type { Generation } from '@/lib/types'

interface VideoCardProps {
  generation: Generation
}

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  processing: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-emerald-500/20 text-emerald-400',
  failed: 'bg-red-500/20 text-red-400',
}

const statusLabel: Record<string, string> = {
  pending: 'Queued',
  processing: 'Generating',
  completed: 'Done',
  failed: 'Failed',
}

export default function VideoCard({ generation: g }: VideoCardProps) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="group flex flex-col gap-3 animate-fade-in">
      {/* Media area */}
      <div className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 aspect-video">

        {/* Completed: show video */}
        {g.status === 'completed' && g.output_video_url ? (
          <>
            <video
              src={g.output_video_url}
              className="w-full h-full object-cover"
              loop
              playsInline
              muted
              onMouseEnter={(e) => { e.currentTarget.play(); setPlaying(true) }}
              onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; setPlaying(false) }}
            />
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-zinc-950/70 flex items-center justify-center">
                  <svg width="14" height="16" viewBox="0 0 14 16" fill="white">
                    <path d="M1 1l12 7-12 7V1z"/>
                  </svg>
                </div>
              </div>
            )}
            {/* Download button */}
            <a
              href={g.output_video_url}
              download
              className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-zinc-950/80 border border-zinc-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800"
              aria-label="Download video"
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </>
        ) : g.status === 'processing' || g.status === 'pending' ? (
          /* Shimmer skeleton */
          <div className="w-full h-full bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 bg-[length:200%_100%] animate-shimmer flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs text-zinc-500">{statusLabel[g.status]}</p>
          </div>
        ) : (
          /* Failed */
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8.5" stroke="#ef4444" strokeWidth="1.5"/>
              <path d="M10 6v4M10 13v1" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-red-400">Generation failed</p>
          </div>
        )}

        {/* Type badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-950/80 text-zinc-400 border border-zinc-700">
          {g.type === 'text-to-video' ? 'T→V' : 'I→V'}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-zinc-200 leading-snug line-clamp-2">{g.prompt}</p>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${statusColor[g.status]}`}>
            {statusLabel[g.status]}
          </span>
          <span className="text-[11px] text-zinc-500">
            {g.aspect_ratio} · {g.duration}s
          </span>
          <span className="text-[11px] text-zinc-600 ml-auto">
            {new Date(g.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  )
}
