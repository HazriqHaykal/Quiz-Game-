import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useActions, useGame } from '../game/GameContext'

export function useSecondsLeft(): number {
  const { timer } = useGame()
  return Math.ceil(timer.remainingMs / 1000)
}

/** Big pixel countdown with escalating panic in the last three seconds. */
export function TimerDisplay({ boss = false }: { boss?: boolean }) {
  const { timer } = useGame()
  const actions = useActions()
  const secs = useSecondsLeft()
  const running = timer.status === 'running'
  const expired = timer.status === 'expired'
  const danger = (running && secs <= 3) || expired
  const fraction = timer.durationMs ? timer.remainingMs / timer.durationMs : 0

  // Sound cues fire once per second boundary, only while the clock actually runs.
  const lastSec = useRef(secs)
  useEffect(() => {
    if (running && secs !== lastSec.current && secs <= 3 && secs > 0) actions.sfx('warning')
    lastSec.current = secs
  }, [secs, running, actions])
  const prevStatus = useRef(timer.status)
  useEffect(() => {
    if (timer.status === 'expired' && prevStatus.current === 'running') actions.sfx('timeUp')
    prevStatus.current = timer.status
  }, [timer.status, actions])

  const color = danger ? 'var(--color-danger)' : boss ? 'var(--color-danger)' : 'var(--color-acid)'

  return (
    <div
      className={`relative flex items-center gap-3 border-4 bg-void px-4 py-1 hard-sm ${danger && running ? 'shake' : ''}`}
      style={{ borderColor: color, ['--shadow' as string]: color }}
      role="timer"
      aria-label={`${secs} seconds left, timer ${timer.status}`}
    >
      <div className="flex flex-col items-start">
        <span className="font-pixel text-lg leading-none text-muted">
          {expired ? 'TIME UP' : running ? 'TIME' : timer.status === 'paused' ? 'PAUSED' : 'READY'}
        </span>
        <div className="h-2 w-24 bg-char-2">
          <div className="h-full transition-[width] duration-100 ease-linear" style={{ width: `${fraction * 100}%`, background: color }} />
        </div>
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={secs}
          className={`t-hud min-w-[2ch] text-right text-[clamp(3.5rem,6.5vw,7rem)]`}
          style={{ color }}
          initial={danger ? { scale: 1.8, opacity: 0 } : { y: -12, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: timer.status === 'paused' ? 0.55 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 24 }}
        >
          {String(secs).padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

/** Giant translucent 3·2·1 flashing across the arena. Never blocks clicks. */
export function CountdownFlash({ boss = false }: { boss?: boolean }) {
  const { timer } = useGame()
  const secs = useSecondsLeft()
  const show = timer.status === 'running' && secs <= 3 && secs > 0
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center" aria-hidden="true">
      <AnimatePresence>
        {show && (
          <motion.span
            key={secs}
            className="t-hud text-[42vh] text-danger"
            style={{ textShadow: '0 0 40px rgba(255,59,59,0.8)' }}
            initial={{ scale: boss ? 3 : 2, opacity: 0 }}
            animate={{ scale: 1, opacity: boss ? 0.32 : 0.2 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {secs}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
