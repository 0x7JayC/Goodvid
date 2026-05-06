import Link from 'next/link'
import RecentGenerations from '@/components/recent-generations'

const QUICK_ACTIONS = [
  {
    href: '/director',
    label: 'Director',
    sublabel: 'References → Bible → Film',
    desc: 'Upload character + environment, AI writes the scene and generates the full production bible, then renders a 15s Seedance video.',
    color: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10',
    badge: 'bg-blue-500/15 text-blue-400',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="1.5" y="2.5" width="19" height="13" rx="2" stroke="#60a5fa" strokeWidth="1.3"/>
        <path d="M7 19h8M11 15.5V19" stroke="#60a5fa" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M7 9l3 2.5 5-5" stroke="#60a5fa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/generate',
    label: 'Generate',
    sublabel: 'Text or Image → Video',
    desc: 'Paste a prompt or upload an image. Pick duration and aspect ratio. Seedance generates the clip directly.',
    color: 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800/80',
    badge: 'bg-zinc-800 text-zinc-400',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="9.5" stroke="#71717a" strokeWidth="1.3"/>
        <path d="M8.5 7.5l6 3.5-6 3.5V7.5z" fill="#71717a"/>
      </svg>
    ),
  },
  {
    href: '/gallery',
    label: 'Gallery',
    sublabel: 'All generations',
    desc: 'Browse everything you\'ve generated. Hover to play, download MP4, filter by status.',
    color: 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800/80',
    badge: 'bg-zinc-800 text-zinc-400',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="1.5" y="1.5" width="8" height="8" rx="1.5" stroke="#71717a" strokeWidth="1.3"/>
        <rect x="12.5" y="1.5" width="8" height="8" rx="1.5" stroke="#71717a" strokeWidth="1.3"/>
        <rect x="1.5" y="12.5" width="8" height="8" rx="1.5" stroke="#71717a" strokeWidth="1.3"/>
        <rect x="12.5" y="12.5" width="8" height="8" rx="1.5" stroke="#71717a" strokeWidth="1.3"/>
      </svg>
    ),
  },
]

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Goodvid · Private AI video studio · Jay</p>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {QUICK_ACTIONS.map(({ href, label, sublabel, desc, color, badge, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col gap-4 p-5 rounded-2xl border transition-all group ${color}`}
          >
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                {icon}
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${badge}`}>
                {sublabel}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-base font-semibold text-zinc-100">{label}</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-600 group-hover:text-blue-400 transition-colors mt-auto">
              Open {label}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* System status */}
      <div className="mb-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">System</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Supabase', key: 'NEXT_PUBLIC_SUPABASE_URL' },
            { label: 'OpenRouter', key: 'OPENROUTER_API_KEY' },
            { label: 'Video model', key: 'OPENROUTER_VIDEO_MODEL' },
            { label: 'Image model', key: 'OPENROUTER_IMAGE_MODEL' },
          ].map(({ label, key }) => {
            const val = process.env[key as keyof NodeJS.ProcessEnv] as string | undefined
            const ok = !!(val && val !== '' && !val.startsWith('your-'))
            return (
              <div key={key} className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div>
                  <p className="text-xs font-medium text-zinc-300">{label}</p>
                  <p className="text-[10px] text-zinc-600 font-mono truncate max-w-[120px]">
                    {ok ? (val!.length > 20 ? `…${val!.slice(-8)}` : val) : 'not set'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent generations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recent</p>
          <Link href="/gallery" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            View all →
          </Link>
        </div>
        <RecentGenerations />
      </div>
    </div>
  )
}
