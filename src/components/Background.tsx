import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { FLOATERS } from '../game/copy'
import { PixelSkull } from './ui'

/** Deterministic pseudo-random so the layout is stable across renders. */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

const FLOAT_COLORS = ['var(--color-acid)', 'var(--color-pink)', 'var(--color-purple)', 'var(--color-cyan)']

export function Background({ boss = false, intensity = 1 }: { boss?: boolean; intensity?: number }) {
  const reduce = useReducedMotion()
  const items = useMemo(
    () =>
      Array.from({ length: Math.round(12 * intensity) }, (_, i) => ({
        i,
        text: FLOATERS[i % FLOATERS.length],
        left: rand(i + 1) * 92,
        top: rand(i + 50) * 88,
        rot: (rand(i + 7) - 0.5) * 30,
        dur: 14 + rand(i + 3) * 14,
        color: FLOAT_COLORS[i % FLOAT_COLORS.length],
        skull: i % 4 === 3,
      })),
    [intensity],
  )

  return (
    <div className={`pointer-events-none fixed inset-0 overflow-hidden ${boss ? 'boss' : ''}`} aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background: boss
            ? 'radial-gradient(ellipse at 50% 0%, rgba(255,59,59,0.28), transparent 60%), radial-gradient(ellipse at 50% 120%, rgba(157,77,255,0.25), transparent 60%)'
            : 'radial-gradient(ellipse at 15% 0%, rgba(157,77,255,0.28), transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(255,43,214,0.18), transparent 55%)',
        }}
      />
      {/* Perspective grid floor */}
      <div className="absolute inset-x-0 bottom-0 h-[45vh] [perspective:400px]">
        <div
          className="grid-floor absolute inset-x-[-50%] bottom-0 h-[200%] origin-bottom opacity-60"
          style={{ transform: 'rotateX(62deg)', maskImage: 'linear-gradient(to top, black 30%, transparent)' }}
        />
      </div>
      {items.map((it) => (
        <motion.div
          key={it.i}
          className="absolute select-none font-pixel text-3xl opacity-[0.13]"
          style={{ left: `${it.left}%`, top: `${it.top}%`, color: boss ? 'var(--color-danger)' : it.color, rotate: it.rot }}
          animate={reduce ? undefined : { y: [0, -24, 0], rotate: [it.rot, it.rot + 6, it.rot] }}
          transition={{ duration: it.dur, repeat: Infinity, ease: 'easeInOut' }}
        >
          {it.skull ? <PixelSkull size={44} color={boss ? 'var(--color-danger)' : it.color} /> : it.text}
        </motion.div>
      ))}
    </div>
  )
}

export function WarningTape({ text, tone = 'acid' }: { text: string; tone?: 'acid' | 'danger' }) {
  const items = Array.from({ length: 8 }, () => text)
  const bg = tone === 'danger' ? 'bg-danger' : 'bg-acid'
  return (
    <div className={`relative overflow-hidden border-y-4 border-void ${bg} py-1 text-void`} role="presentation">
      <div className="marquee">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-4 px-4 font-pixel text-2xl tracking-wide">
            <PixelSkull size={20} color="var(--color-void)" />
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
