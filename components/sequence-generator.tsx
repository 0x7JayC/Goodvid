'use client'

import { useState, useEffect, useRef } from 'react'
import type { Shot } from '@/lib/types'

interface ShotJob {
  shot: Shot
  generationId?: string
  taskId?: string
  status: 'queued' | 'submitting' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  error?: string
}

interface SequenceGeneratorProps {
  shots: Shot[]
  onBack: () => void
}

const POLL_INTERVAL = 3000
const POLL_TIMEOUT = 5 * 60 * 1000

export default function SequenceGenerator({ shots, onBack }: SequenceGeneratorProps) {
  const [jobs, setJobs] = useState<ShotJob[]>(
    shots.map((shot) => ({ shot, status: 'queued' }))
  )
  const [started, setStarted] = useState(false)
  const [activeVideo, setActiveVideo] = useState<number | null>(null)
  const pollTimers = useRef<Map<number, NodeJS.Timeout>>(new Map())

  const updateJob = (index: number, updates: Partial<ShotJob>) => {
    setJobs((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }
      return next
    })
  }

  const pollJob = async (index: number, taskId: string, deadline: number) => {
    if (Date.now() > deadline) {
      updateJob(index, { status: 'failed', error: 'Timed out after 5 minutes' })
      return
    }

    try {
      const res = await fetch(`/api/poll/${taskId}`)
      const data = await res.json()

      if (data.status === 'completed') {
        updateJob(index, { status: 'completed', videoUrl: data.videoUrl })
        return
      }

      if (data.status === 'failed') {
        updateJob(index, { status: 'failed', error: data.error ?? 'Generation failed' })
        return
      }

      // still running — schedule next poll
      updateJob(index, { status: data.status === 'processing' ? 'processing' : 'processing' })
      const timer = setTimeout(() => pollJob(index, taskId, deadline), POLL_INTERVAL)
      pollTimers.current.set(index, timer)
    } catch (err) {
      updateJob(index, { status: 'failed', error: String(err) })
    }
  }

  const submitShot = async (index: number) => {
    const shot = shots[index]
    updateJob(index, { status: 'submitting' })

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text-to-video',
          prompt: shot.seedance_prompt,
          duration: shot.duration,
          aspectRatio: shot.aspect_ratio,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        updateJob(index, { status: 'failed', error: data.error ?? 'Submit failed' })
        return
      }

      updateJob(index, {
        status: 'processing',
        generationId: data.generationId,
        taskId: data.taskId,
      })

      const deadline = Date.now() + POLL_TIMEOUT
      setTimeout(() => pollJob(index, data.taskId, deadline), POLL_INTERVAL)
    } catch (err) {
      updateJob(index, { status: 'failed', error: String(err) })
    }
  }

  // Submit all shots with a staggered 800ms delay between each
  const startGeneration = async () => {
    setStarted(true)
    for (let i = 0; i < shots.length; i++) {
      await new Promise((r) => setTimeout(r, i === 0 ? 0 : 800))
      submitShot(i)
    }
  }

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = pollTimers.current
    return () => timers.forEach((t) => clearTimeout(t))
  }, [])

  const completedCount = jobs.filter((j) => j.status === 'completed').length
  const failedCount = jobs.filter((j) => j.status === 'failed').length
  const allDone = completedCount + failedCount === shots.length && started
  const totalSeconds = shots.reduce((sum, s) => sum + s.duration, 0)

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-100">
            {allDone ? 'Sequence Complete' : started ? 'Generating Sequence...' : 'Ready to Produce'}
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            {shots.length} shots · ~{totalSeconds}s total
          </p>
        </div>

        {!started && (
          <button
            onClick={startGeneration}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all active:scale-[0.98]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M2 2l10 5-10 5V2z"/>
            </svg>
            Produce {totalSeconds}s Sequence
          </button>
        )}

        {started && !allDone && (
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm text-zinc-400">
              {completedCount}/{shots.length} shots done
            </span>
          </div>
        )}

        {allDone && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            New scene
          </button>
        )}
      </div>

      {/* Progress bar */}
      {started && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / shots.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">
            {allDone
              ? failedCount > 0
                ? `${completedCount} generated · ${failedCount} failed`
                : `All ${completedCount} shots ready`
              : `Generating shot ${Math.min(completedCount + 1, shots.length)} of ${shots.length}`}
          </p>
        </div>
      )}

      {/* Shot jobs list */}
      <div className="flex flex-col gap-3">
        {jobs.map((job, i) => (
          <ShotJobRow
            key={i}
            job={job}
            index={i}
            isActive={activeVideo === i}
            onVideoClick={() => setActiveVideo(activeVideo === i ? null : i)}
          />
        ))}
      </div>

      {/* Completed sequence playback */}
      {allDone && completedCount > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-zinc-300">
            Your Sequence — play in order
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs
              .filter((j) => j.status === 'completed' && j.videoUrl)
              .map((j, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="rounded-xl overflow-hidden border border-zinc-800 aspect-video bg-zinc-900">
                    <video
                      src={j.videoUrl}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                      loop
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{j.shot.label}</span>
                    <a
                      href={j.videoUrl}
                      download
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Individual shot job row ──────────────────────────────────────────────────

function ShotJobRow({
  job,
  index,
  isActive,
  onVideoClick,
}: {
  job: ShotJob
  index: number
  isActive: boolean
  onVideoClick: () => void
}) {
  const statusConfig = {
    queued: { color: 'text-zinc-500', bg: 'bg-zinc-800', label: 'Queued' },
    submitting: { color: 'text-yellow-400', bg: 'bg-yellow-500/15', label: 'Submitting...' },
    processing: { color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Generating...' },
    completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Done' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/15', label: 'Failed' },
  }

  const cfg = statusConfig[job.status]
  const isRunning = job.status === 'submitting' || job.status === 'processing'

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        {/* Number */}
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
          {isRunning ? (
            <div className="w-3 h-3 border-2 border-zinc-600 border-t-blue-400 rounded-full animate-spin" />
          ) : job.status === 'completed' ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : job.status === 'failed' ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2L2 10" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <span className="text-xs font-mono text-zinc-500">{index + 1}</span>
          )}
        </div>

        {/* Shot info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-200 truncate">{job.shot.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono">
              {job.shot.type} · {job.shot.duration}s
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{job.shot.seedance_prompt.slice(0, 80)}…</p>
        </div>

        {/* Status badge */}
        <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>

        {/* Play button if done */}
        {job.status === 'completed' && job.videoUrl && (
          <button
            onClick={onVideoClick}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 transition-colors"
          >
            {isActive ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="2" y="1" width="2.5" height="8" rx="1" fill="#a1a1aa"/>
                <rect x="5.5" y="1" width="2.5" height="8" rx="1" fill="#a1a1aa"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="#a1a1aa">
                <path d="M2 1.5l6 3.5-6 3.5V1.5z"/>
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Inline video preview when active */}
      {isActive && job.videoUrl && (
        <div className="border-t border-zinc-800">
          <video
            src={job.videoUrl}
            className="w-full max-h-48 object-contain bg-zinc-950"
            autoPlay
            loop
            playsInline
            controls
          />
        </div>
      )}

      {/* Error message */}
      {job.status === 'failed' && job.error && (
        <div className="px-4 pb-3 border-t border-red-500/10">
          <p className="text-xs text-red-400 mt-2">{job.error}</p>
        </div>
      )}
    </div>
  )
}
