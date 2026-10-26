import { motion } from 'framer-motion'
import { ArrowLeft, Swords } from 'lucide-react'
import { useEffect } from 'react'
import { useActions, useGame } from '../game/GameContext'
import { BASE_POINTS, CLUE_POINTS, currentQuestion, isFinalRound, roundMultiplier } from '../game/logic'
import { WarningTape } from './Background'
import { PixelSkull, useUI } from './ui'

export function RoundIntro() {
  const state = useGame()
  const actions = useActions()
  const ui = useUI()
  const boss = isFinalRound(state.round)
  const mult = roundMultiplier(state)
  const round = state.rounds[state.round - 1]
  const q = currentQuestion(state)

  useEffect(() => {
    if (boss) actions.sfx('boss')
  }, [boss, actions])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui.busy) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        actions.enterArena()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actions, ui.busy])

  const accent = boss ? 'var(--color-danger)' : 'var(--color-acid)'

  return (
    <div className="flex h-full flex-col">
      {boss && <WarningTape text="FINAL BOSS INCOMING" tone="danger" />}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[3vh] px-[4vw] text-center">
        {boss ? (
          <motion.div
            initial={{ scale: 4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 12 }}
            className="flex flex-col items-center"
          >
            <PixelSkull size={110} color="var(--color-danger)" className="shake" />
            <h1 className="glitch mt-4 text-[clamp(4rem,11vw,12rem)] font-bold leading-[0.8] tracking-[-0.05em] text-danger" data-text="FINAL BOSS">
              FINAL BOSS
            </h1>
            <p className="mt-3 font-pixel text-4xl text-paper">ROUND 06 · {q.topic.toUpperCase()}</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ x: '-60vw', skewX: -30 }}
            animate={{ x: 0, skewX: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          >
            <p className="font-pixel text-4xl text-pink">GET READY</p>
            <h1 className="t-hud text-[clamp(7rem,18vw,18rem)] text-acid">ROUND {String(state.round).padStart(2, '0')}</h1>
            <p className="text-3xl font-bold">{q.topic}</p>
          </motion.div>
        )}

        <motion.div
          className="border-4 bg-void px-6 py-3 text-2xl font-bold hard"
          style={{ borderColor: accent, ['--shadow' as string]: accent }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {mult > 1 && <span className="mr-3 bg-danger px-2 text-void">DOUBLE POINTS</span>}
          Correct <span style={{ color: accent }}>+{BASE_POINTS * mult}</span>
          <span className="mx-3 text-muted">/</span>
          with clue <span style={{ color: accent }}>+{CLUE_POINTS * mult}</span>
          <span className="mx-3 text-muted">/</span>
          wrong <span className="text-muted">+0</span>
        </motion.div>

        {round.repsConfirmed && (
          <ul className="flex flex-wrap justify-center gap-3" aria-label="Representatives">
            {state.teams.map((t, i) => (
              <motion.li
                key={t.id}
                className="border-[3px] bg-char px-4 py-2 text-left"
                style={{ borderColor: t.color }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 + i * 0.06 }}
              >
                <span className="block text-sm font-semibold" style={{ color: t.color }}>
                  {t.name}
                </span>
                <span className="text-2xl font-bold">{round.reps[t.id] ?? '—'}</span>
              </motion.li>
            ))}
          </ul>
        )}

        <div className="flex gap-4">
          <button className="btn btn-ghost" onClick={() => actions.setPhase('reps')}>
            <ArrowLeft size={18} /> Change representatives
          </button>
          <button className={`btn ${boss ? 'btn-danger' : 'btn-acid'} px-8 text-2xl`} onClick={actions.enterArena} autoFocus>
            <Swords size={26} /> {boss ? 'Fight the boss' : 'Enter the arena'}
          </button>
        </div>
      </div>
    </div>
  )
}
