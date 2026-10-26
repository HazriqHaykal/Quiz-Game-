import { motion } from 'framer-motion'
import { BookOpen, Pencil, Play, RotateCcw, Swords, Users } from 'lucide-react'
import { useActions, useGame } from '../game/GameContext'
import { TOTAL_ROUNDS } from '../game/types'
import { WarningTape } from './Background'
import { PixelSkull, useUI } from './ui'

export function GlitchTitle({ size = 'xl' }: { size?: 'xl' | 'md' }) {
  const cls = size === 'xl' ? 'text-[clamp(3rem,8.4vw,10rem)]' : 'text-[clamp(2rem,4.5vw,4.5rem)]'
  return (
    <h1 className={`${cls} font-bold leading-[0.85] tracking-[-0.05em]`}>
      <span className="glitch block" data-text="CRACK THE">
        CRACK THE
      </span>
      <span className="glitch block text-acid" data-text="ETHICS CODE">
        ETHICS CODE
      </span>
    </h1>
  )
}

export function RoundTrack({ current, finished = false }: { current: number; finished?: boolean }) {
  return (
    <ol className="flex items-stretch gap-2" aria-label={`Round ${current} of ${TOTAL_ROUNDS}`}>
      {Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
        const n = i + 1
        const boss = n === TOTAL_ROUNDS
        const done = finished || n < current
        const now = !finished && n === current
        return (
          <li
            key={n}
            className={`flex min-w-12 items-center justify-center gap-1 border-[3px] px-2 py-0.5 font-pixel text-2xl ${
              now
                ? boss
                  ? 'border-danger bg-danger text-void'
                  : 'border-acid bg-acid text-void'
                : done
                  ? 'border-purple bg-purple/30 text-paper'
                  : boss
                    ? 'border-danger/70 text-danger'
                    : 'border-[#3a3350] text-muted'
            }`}
            aria-current={now ? 'step' : undefined}
          >
            {boss ? (
              <>
                <PixelSkull size={16} color={now ? 'var(--color-void)' : 'var(--color-danger)'} /> BOSS
              </>
            ) : (
              `R${n}`
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function Lobby() {
  const state = useGame()
  const actions = useActions()
  const ui = useUI()

  const inProgress =
    state.history.length > 0 || state.round > 1 || state.rounds.some((r) => r.repsConfirmed || r.clueRevealed || r.answerRevealed)

  const cur = state.rounds[state.round - 1]
  const roundTouched =
    cur.repsConfirmed || cur.clueRevealed || cur.answerRevealed || Object.keys(cur.marks).length > 0

  const start = async () => {
    if (inProgress) {
      const ok = await ui.confirm({
        title: 'Start a new game?',
        body: 'This wipes all current scores, judgements and representative history. Questions, teams and settings are kept.',
        confirmLabel: 'Wipe scores and start',
        danger: true,
      })
      if (!ok) return
    }
    actions.startGame()
  }

  return (
    <div className="flex h-full flex-col">
      <WarningTape text="WARNING: 99% BRAINROT DETECTED" />
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-6 px-[4vw] py-[3vh]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="relative">
            <GlitchTitle />
            <motion.div
              className="relative mt-[1.2vh] ml-[22%] inline-block origin-left border-4 border-void bg-pink px-4 py-1 text-[clamp(1.2rem,2.4vw,2.6rem)] font-bold text-void hard"
              initial={{ scale: 3, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: -6, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.25 }}
            >
              BRAINROT EDITION 💀
            </motion.div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <p className="max-w-sm text-right text-lg text-muted">
              Five groups. Six questions on plagiarism and intellectual property. One host. Zero chill.
            </p>
            <RoundTrack current={inProgress ? state.round : 0} />
          </div>
        </div>

        <section aria-label="Competing teams" className="grid grid-cols-5 gap-[1.2vw]">
          {state.teams.map((t, i) => (
            <motion.div
              key={t.id}
              className="flex flex-col justify-between border-4 bg-void p-3 hard"
              style={{ borderColor: t.color, ['--shadow' as string]: t.color }}
              initial={{ y: 60, opacity: 0, rotate: i % 2 ? 3 : -3 }}
              animate={{ y: 0, opacity: 1, rotate: i % 2 ? 1 : -1 }}
              transition={{ type: 'spring', delay: 0.4 + i * 0.07 }}
            >
              <span className="t-hud text-[clamp(3rem,6vw,6.5rem)]" style={{ color: t.color }}>
                {t.name.replace(/^group\s*/i, '') || '?'}
              </span>
              <span className="truncate text-xl font-bold">{t.name}</span>
              <span className="text-sm text-muted">
                {t.members.length} members · score {state.scores[t.id]}
              </span>
            </motion.div>
          ))}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-ghost" onClick={() => ui.open('editor')}>
              <Pencil size={18} /> Edit questions
            </button>
            <button className="btn btn-ghost" onClick={() => ui.open('settings')}>
              <Users size={18} /> Teams & settings
            </button>
            <button className="btn btn-ghost" onClick={() => ui.open('help')}>
              <BookOpen size={18} /> Host guide
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {inProgress && (
              <button className="btn btn-purple text-xl" onClick={() => actions.setPhase(roundTouched ? 'arena' : 'reps')}>
                <RotateCcw size={22} /> Resume round {state.round}
              </button>
            )}
            <motion.button
              className="btn btn-acid px-10 py-4 text-[clamp(1.6rem,3vw,3rem)]"
              onClick={start}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              autoFocus
            >
              {inProgress ? <Swords size={36} /> : <Play size={36} fill="currentColor" />}
              {inProgress ? 'NEW GAME' : 'START GAME'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
