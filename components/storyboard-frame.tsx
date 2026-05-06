import type { ShotType } from '@/lib/types'

interface StoryboardFrameProps {
  shotType: ShotType
  cameraMovement: string
  emotion: string
  className?: string
}

/** Returns the camera movement arrow direction */
function getMovementArrow(movement: string): {
  type: 'none' | 'push' | 'pull' | 'pan-left' | 'pan-right' | 'tilt-up' | 'tilt-down' | 'orbit'
} {
  const m = movement.toLowerCase()
  if (m.includes('push') || m.includes('dolly forward') || m.includes('dolly in') || m.includes('zoom in')) return { type: 'push' }
  if (m.includes('pull') || m.includes('dolly back') || m.includes('zoom out')) return { type: 'pull' }
  if (m.includes('pan left')) return { type: 'pan-left' }
  if (m.includes('pan right')) return { type: 'pan-right' }
  if (m.includes('tilt up')) return { type: 'tilt-up' }
  if (m.includes('tilt down')) return { type: 'tilt-down' }
  if (m.includes('orbit') || m.includes('arc')) return { type: 'orbit' }
  return { type: 'none' }
}

/** Renders a simple silhouette for each shot type */
function ShotSubject({ type }: { type: ShotType }) {
  // viewBox is 160×90 (16:9)
  const W = 160
  const H = 90

  // Rule-of-thirds helpers
  const x1 = W / 3        // 53.3
  const x2 = (W * 2) / 3  // 106.6
  const y1 = H / 3        // 30
  const y2 = (H * 2) / 3  // 60

  switch (type) {
    case 'EWS': // tiny figure, vast space
      return (
        <>
          {/* Horizon */}
          <line x1="0" y1={y2} x2={W} y2={y2} stroke="#3f3f46" strokeWidth="0.5"/>
          {/* Tiny figure at lower third */}
          <rect x={x1 - 2} y={y2 - 14} width="4" height="10" rx="1" fill="#3b82f6" opacity="0.8"/>
          <circle cx={x1} cy={y2 - 16} r="3" fill="#3b82f6" opacity="0.8"/>
        </>
      )

    case 'WS': // full body, subject ~40% frame height
      return (
        <>
          <line x1="0" y1={y2 + 8} x2={W} y2={y2 + 8} stroke="#3f3f46" strokeWidth="0.5"/>
          {/* Body */}
          <rect x={x1 - 5} y={y1 + 5} width="10" height="35" rx="2" fill="#3b82f6" opacity="0.8"/>
          {/* Head */}
          <circle cx={x1} cy={y1 + 2} r="6" fill="#3b82f6" opacity="0.9"/>
        </>
      )

    case 'MS': // waist up, ~60% frame height
      return (
        <>
          {/* Body (cropped at waist — bottom of frame) */}
          <rect x={W / 2 - 14} y={y1 - 2} width="28" height={H - y1 + 2} rx="3" fill="#3b82f6" opacity="0.7"/>
          {/* Shoulders wider */}
          <rect x={W / 2 - 18} y={y1 + 10} width="36" height="20" rx="4" fill="#3b82f6" opacity="0.8"/>
          {/* Head */}
          <circle cx={W / 2} cy={y1 - 5} r="11" fill="#3b82f6" opacity="0.9"/>
        </>
      )

    case 'MCU': // chest to top of head, 75%
      return (
        <>
          <rect x={W / 2 - 20} y={y1 + 5} width="40" height={H - y1 - 5 + 10} rx="3" fill="#3b82f6" opacity="0.7"/>
          <rect x={W / 2 - 24} y={y1 + 18} width="48" height="18" rx="4" fill="#3b82f6" opacity="0.75"/>
          <circle cx={W / 2} cy={y1 + 2} r="16" fill="#3b82f6" opacity="0.9"/>
        </>
      )

    case 'CU': // head + shoulders filling most of frame
      return (
        <>
          {/* Shoulders/chest bleed off bottom */}
          <rect x={W / 2 - 35} y={H / 2 + 10} width="70" height="60" rx="5" fill="#3b82f6" opacity="0.65"/>
          {/* Head large, centered */}
          <ellipse cx={W / 2} cy={H / 2 - 5} rx="28" ry="32" fill="#3b82f6" opacity="0.88"/>
          {/* Eye line hint */}
          <line x1={W / 2 - 10} y1={H / 2 - 8} x2={W / 2 + 10} y2={H / 2 - 8} stroke="#1d4ed8" strokeWidth="1.5" opacity="0.6"/>
        </>
      )

    case 'ECU': // extreme detail — eye/mouth/hand
      return (
        <>
          {/* Large oval filling most of frame — suggests extreme close detail */}
          <ellipse cx={W / 2} cy={H / 2} rx="60" ry="36" fill="#3b82f6" opacity="0.75"/>
          {/* Subtle iris circle */}
          <circle cx={W / 2} cy={H / 2} r="16" fill="#1d4ed8" opacity="0.9"/>
          <circle cx={W / 2} cy={H / 2} r="7" fill="#0f172a" opacity="0.8"/>
          <circle cx={W / 2 + 5} cy={H / 2 - 5} r="3" fill="white" opacity="0.6"/>
        </>
      )

    case 'OTS': // over shoulder — back of head foreground, subject background
      return (
        <>
          {/* Foreground shoulder/back of head */}
          <ellipse cx={W * 0.2} cy={H * 0.3} rx="22" ry="18" fill="#27272a" opacity="0.9"/>
          <rect x="0" y={H * 0.4} width={W * 0.35} height={H * 0.8} rx="4" fill="#27272a" opacity="0.85"/>
          {/* Background subject — right third */}
          <circle cx={W * 0.65} cy={H / 2 - 5} r="14" fill="#3b82f6" opacity="0.85"/>
          <rect x={W * 0.65 - 10} y={H / 2 + 10} width="20" height="22" rx="3" fill="#3b82f6" opacity="0.75"/>
        </>
      )

    case 'POV': // horizon + target circle
      return (
        <>
          <line x1="0" y1={H * 0.55} x2={W} y2={H * 0.55} stroke="#3f3f46" strokeWidth="0.5"/>
          {/* Crosshair/focus at center */}
          <circle cx={W / 2} cy={H * 0.5} r="12" stroke="#3b82f6" strokeWidth="1" fill="none" opacity="0.7"/>
          <line x1={W / 2 - 18} y1={H * 0.5} x2={W / 2 - 14} y2={H * 0.5} stroke="#3b82f6" strokeWidth="1" opacity="0.7"/>
          <line x1={W / 2 + 14} y1={H * 0.5} x2={W / 2 + 18} y2={H * 0.5} stroke="#3b82f6" strokeWidth="1" opacity="0.7"/>
          <line x1={W / 2} y1={H * 0.5 - 18} x2={W / 2} y2={H * 0.5 - 14} stroke="#3b82f6" strokeWidth="1" opacity="0.7"/>
          <line x1={W / 2} y1={H * 0.5 + 14} x2={W / 2} y2={H * 0.5 + 18} stroke="#3b82f6" strokeWidth="1" opacity="0.7"/>
          {/* Target figure */}
          <circle cx={W / 2} cy={H * 0.5} r="4" fill="#3b82f6" opacity="0.8"/>
        </>
      )

    case 'INSERT': // object/detail — hands or object centered
      return (
        <>
          {/* Object shape centered */}
          <rect x={W / 2 - 30} y={H / 2 - 18} width="60" height="36" rx="5" fill="#3b82f6" opacity="0.75"/>
          {/* Texture lines */}
          <line x1={W / 2 - 18} y1={H / 2 - 6} x2={W / 2 + 18} y2={H / 2 - 6} stroke="#1d4ed8" strokeWidth="1" opacity="0.7"/>
          <line x1={W / 2 - 18} y1={H / 2} x2={W / 2 + 18} y2={H / 2} stroke="#1d4ed8" strokeWidth="1" opacity="0.7"/>
          <line x1={W / 2 - 18} y1={H / 2 + 6} x2={W / 2 + 18} y2={H / 2 + 6} stroke="#1d4ed8" strokeWidth="1" opacity="0.7"/>
        </>
      )

    default:
      return <circle cx={W / 2} cy={H / 2} r="18" fill="#3b82f6" opacity="0.7"/>
  }
}

/** Camera movement indicator arrow */
function MovementIndicator({ type }: { type: ReturnType<typeof getMovementArrow>['type'] }) {
  if (type === 'none') return null
  const W = 160, H = 90

  const arrowProps = {
    stroke: '#fbbf24',
    strokeWidth: '1.5',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    opacity: 0.85,
    fill: 'none',
  }

  switch (type) {
    case 'push':
      return (
        <g {...arrowProps}>
          <path d={`M ${W - 22} ${H - 18} L ${W - 10} ${H - 10} L ${W - 18} ${H - 10} M ${W - 10} ${H - 10} L ${W - 10} ${H - 20}`}/>
          <text x={W - 30} y={H - 5} fontSize="5" fill="#fbbf24" stroke="none" opacity="0.9">PUSH IN</text>
        </g>
      )
    case 'pull':
      return (
        <g {...arrowProps}>
          <path d={`M ${W - 10} ${H - 10} L ${W - 22} ${H - 18} L ${W - 14} ${H - 18} M ${W - 22} ${H - 18} L ${W - 22} ${H - 8}`}/>
          <text x={W - 34} y={H - 5} fontSize="5" fill="#fbbf24" stroke="none" opacity="0.9">PULL BACK</text>
        </g>
      )
    case 'pan-left':
      return (
        <g {...arrowProps}>
          <path d={`M 24 ${H - 12} L 12 ${H - 12} L 16 ${H - 16} M 12 ${H - 12} L 16 ${H - 8}`}/>
          <text x="10" y={H - 5} fontSize="5" fill="#fbbf24" stroke="none" opacity="0.9">PAN</text>
        </g>
      )
    case 'pan-right':
      return (
        <g {...arrowProps}>
          <path d={`M 12 ${H - 12} L 24 ${H - 12} L 20 ${H - 16} M 24 ${H - 12} L 20 ${H - 8}`}/>
          <text x="10" y={H - 5} fontSize="5" fill="#fbbf24" stroke="none" opacity="0.9">PAN</text>
        </g>
      )
    case 'tilt-up':
      return (
        <g {...arrowProps}>
          <path d={`M 12 ${H - 10} L 12 ${H - 22} L 8 ${H - 18} M 12 ${H - 22} L 16 ${H - 18}`}/>
          <text x="6" y={H - 5} fontSize="5" fill="#fbbf24" stroke="none" opacity="0.9">TILT</text>
        </g>
      )
    case 'tilt-down':
      return (
        <g {...arrowProps}>
          <path d={`M 12 ${H - 22} L 12 ${H - 10} L 8 ${H - 14} M 12 ${H - 10} L 16 ${H - 14}`}/>
          <text x="6" y={H - 5} fontSize="5" fill="#fbbf24" stroke="none" opacity="0.9">TILT</text>
        </g>
      )
    case 'orbit':
      return (
        <g {...arrowProps}>
          <path d={`M ${W - 24} ${H - 16} Q ${W - 12} ${H - 22} ${W - 10} ${H - 12} L ${W - 14} ${H - 14} M ${W - 10} ${H - 12} L ${W - 18} ${H - 9}`}/>
          <text x={W - 30} y={H - 4} fontSize="5" fill="#fbbf24" stroke="none" opacity="0.9">ORBIT</text>
        </g>
      )
    default:
      return null
  }
}

export default function StoryboardFrame({ shotType, cameraMovement, emotion, className = '' }: StoryboardFrameProps) {
  const W = 160
  const H = 90
  const movement = getMovementArrow(cameraMovement)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full ${className}`}
      style={{ display: 'block' }}
    >
      {/* Background */}
      <rect width={W} height={H} fill="#0f0f11"/>

      {/* Subtle rule-of-thirds grid */}
      <g stroke="#27272a" strokeWidth="0.4" opacity="0.6">
        <line x1={W / 3} y1="0" x2={W / 3} y2={H}/>
        <line x1={(W * 2) / 3} y1="0" x2={(W * 2) / 3} y2={H}/>
        <line x1="0" y1={H / 3} x2={W} y2={H / 3}/>
        <line x1="0" y1={(H * 2) / 3} x2={W} y2={(H * 2) / 3}/>
      </g>

      {/* Subject silhouette */}
      <ShotSubject type={shotType} />

      {/* Camera movement indicator */}
      <MovementIndicator type={movement.type} />

      {/* Frame border — simulates camera viewfinder */}
      <rect x="4" y="4" width={W - 8} height={H - 8} fill="none" stroke="#3f3f46" strokeWidth="0.6"/>
      <rect x="0" y="0" width={W} height={H} fill="none" stroke="#27272a" strokeWidth="1"/>
    </svg>
  )
}
