'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import VideoCard from './video-card'
import type { Generation, GenerationStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: GenerationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'processing', label: 'In Progress' },
  { value: 'failed', label: 'Failed' },
]

const ITEMS_PER_PAGE = 12

export default function GalleryGrid() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [filter, setFilter] = useState<GenerationStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(
    async (reset = false) => {
      setLoading(true)
      const supabase = createClient()
      const currentPage = reset ? 0 : page

      let query = supabase
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1)

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Gallery load error:', error)
      } else {
        if (reset) {
          setGenerations(data ?? [])
          setPage(0)
        } else {
          setGenerations((prev) => [...prev, ...(data ?? [])])
        }
        setHasMore((data?.length ?? 0) === ITEMS_PER_PAGE)
      }

      setLoading(false)
    },
    [filter, page]
  )

  // Reload when filter changes
  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  // Auto-refresh in-progress generations every 5s
  useEffect(() => {
    const hasRunning = generations.some(
      (g) => g.status === 'pending' || g.status === 'processing'
    )
    if (!hasRunning) return

    const id = setInterval(() => load(true), 5000)
    return () => clearInterval(id)
  }, [generations, load])

  return (
    <div className="flex flex-col gap-6">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all active:scale-[0.98] ${
              filter === value
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-500">
          {generations.length} result{generations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {loading && generations.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-video rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 bg-[length:200%_100%] animate-shimmer" />
              <div className="h-4 w-3/4 rounded bg-zinc-800 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-zinc-800/60 animate-pulse" />
            </div>
          ))}
        </div>
      ) : generations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 18l4-4 4 4 4-5 6 5" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8" cy="8" r="2.5" stroke="#3f3f46" strokeWidth="1.5"/>
            </svg>
          </div>
          <p className="text-sm text-zinc-500">No generations yet. Go create something.</p>
          <a
            href="/generate"
            className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-sm text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            Start generating
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {generations.map((g) => (
              <VideoCard key={g.id} generation={g} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => {
                  setPage((p) => p + 1)
                  load()
                }}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
