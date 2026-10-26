import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

export type Tone = 'acid' | 'pink' | 'purple' | 'danger' | 'cyan'

export interface ReactionMsg {
  key: number
  text: string
  tone: Tone
  big?: boolean
}

export function useReaction(durationMs = 1700) {
  const [msg, setMsg] = useState<ReactionMsg | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const counter = useRef(0)
  const show = useCallback(
    (text: string, tone: Tone, big = false) => {
      window.clearTimeout(timer.current)
      counter.current += 1
      setMsg({ key: counter.current, text, tone, big })
      timer.current = window.setTimeout(() => setMsg(null), big ? durationMs + 800 : durationMs)
    },
    [durationMs],
  )
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return [msg, show] as const
}

/** Comic-style impact stamp. Purely decorative: it never captures clicks. */
export function ReactionStamp({ msg }: { msg: ReactionMsg | null }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center" aria-live="assertive">
      <AnimatePresence>
        {msg && (
          <motion.div
            key={msg.key}
            className="relative flex items-center justify-center"
            initial={{ scale: 3, rotate: -25, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0, rotate: 4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          >
            <div
              className={`burst absolute ${msg.big ? 'h-[70vh] w-[70vh]' : 'h-[48vh] w-[48vh]'}`}
              style={{ background: `var(--color-${msg.tone})` }}
            />
            <p
              className={`relative max-w-[60vw] border-4 border-void bg-void px-6 py-3 text-center font-bold leading-none tracking-tight hard ${
                msg.big ? 'text-[clamp(2.4rem,5.5vw,6rem)]' : 'text-[clamp(1.8rem,3.6vw,4rem)]'
              }`}
              style={{ color: `var(--color-${msg.tone})`, ['--shadow' as string]: `var(--color-${msg.tone})` }}
            >
              {msg.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
