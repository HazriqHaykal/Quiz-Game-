import { AnimatePresence, motion } from 'framer-motion'
import { SkipForward } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PixelSkull } from './ui'

const STEPS = [
  { text: 'BOOTING BRAINROT.EXE', ms: 1100 },
  { text: 'SCANNING CLASSROOM FOR BRAINCELLS…', ms: 1100 },
  { text: 'ETHICS MODULE: CORRUPTED', ms: 900 },
]

/** Short, skippable boot sequence. Any key or click skips it. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step >= STEPS.length) {
      onDone()
      return
    }
    const id = window.setTimeout(() => setStep((s) => s + 1), STEPS[step].ms)
    return () => window.clearTimeout(id)
  }, [step, onDone])

  useEffect(() => {
    const skip = () => onDone()
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
  }, [onDone])

  const progress = Math.min(1, (step + 1) / STEPS.length)

  return (
    <motion.div
      className="fixed inset-0 z-40 flex cursor-pointer flex-col items-center justify-center bg-void"
      onClick={onDone}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08, filter: 'blur(6px)' }}
      transition={{ duration: 0.35 }}
    >
      <motion.div animate={{ rotate: [0, -6, 6, 0] }} transition={{ repeat: Infinity, duration: 0.6 }}>
        <PixelSkull size={120} />
      </motion.div>
      <div className="mt-8 h-16">
        <AnimatePresence mode="wait">
          {step < STEPS.length && (
            <motion.p
              key={step}
              className={`font-pixel text-5xl ${step === 2 ? 'text-danger shake' : 'text-acid'}`}
              initial={{ opacity: 0, x: -30, skewX: 20 }}
              animate={{ opacity: 1, x: 0, skewX: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.2 }}
            >
              &gt; {STEPS[step].text}
              <span className="blink">_</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-6 h-6 w-[min(560px,80vw)] border-4 border-acid p-0.5">
        <motion.div className="h-full bg-acid" animate={{ width: `${progress * 99}%` }} transition={{ duration: 0.8 }} />
      </div>
      <p className="mt-2 font-pixel text-2xl text-muted">{Math.round(progress * 99)}% BRAINROT LOADED</p>
      <button
        className="btn btn-ghost absolute bottom-8 right-8 text-lg"
        onClick={(e) => {
          e.stopPropagation()
          onDone()
        }}
        autoFocus
      >
        <SkipForward size={20} /> Skip intro
      </button>
    </motion.div>
  )
}
