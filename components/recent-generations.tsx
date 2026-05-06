'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Generation } from '@/lib/types'

const STATUS_STYLE: Record<string, string> = {
  completed:  'bg-emerald-500/15 text-emerald-400',
  processing: 'bg-blue-500/15 text-blue-400',
  pending:    'bg-yellow-500/15 text-yellow-400',
  failed:     'bg-red-500/15 text-red-400',
}

export default function RecentGenerations() {
  const [rows, setRows] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const sb = createClient()
      const { data } = await sb
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)
      setRows(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="aspect-video rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-zinc-800 py-14 flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 15l4-4 4 4 3-3 5 4" stroke="#3f3f46" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="7" cy="7" r="2" stroke="#3f3f46" strokeWidth="1.3"/>
          </svg>
        </div>
        <p className="text-sm text-zinc-600">No generations yet.</p>
        <a href="/director" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
          Start with Director →
        </a>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {rows.map((g) => (
        <div key={g.id} className="flex flex-col gap-2 group">
          {/* Thumbnail */}
          <div className="relative rounded-xl overflow-hidden border border-zinc-800 aspect-video bg-zinc-900">
            {g.status === 'completed' && g.output_video_url ? (
              <video
                src={g.output_video_url}
                className="w-full h-full object-cover"
                muted
                playsInline
                loop
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                g.status === 'processing' || g.status === 'pending'
                  ? 'bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 bg-[length:200%_100%] animate-shimmer'
                  : ''
              }`}>
                {(g.status === 'processing' || g.status === 'pending') && (
                  <div className="w-5 h-5 border-2 border-zinc-600 border-t-blue-400 rounded-full animate-spin" />
                )}
                {g.status === 'failed' && (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7.5" stroke="#ef4444" strokeWidth="1.3"/>
                    <path d="M9 5.5V9M9 11.5v.5" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
            )}

            {/* Type badge */}
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-950/80 text-zinc-400">
              {g.type === 'text-to-video' ? 'T→V' : 'I→V'}
            </span>

            {/* Download on hover */}
            {g.status === 'completed' && g.output_video_url && (
              <a
                href={g.output_video_url}
                download
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 w-6 h-6 rounded-md bg-zinc-950/80 border border-zinc-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v5.5M2.5 4.5L5 7 7.5 4.5M1 9h8" stroke="#a1a1aa" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-zinc-400 truncate">{g.prompt.slice(0, 36)}{g.prompt.length > 36 ? '…' : ''}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${STATUS_STYLE[g.status] ?? 'bg-zinc-800 text-zinc-500'}`}>
              {g.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
