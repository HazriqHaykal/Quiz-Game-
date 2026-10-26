import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Crown, Eye, History, Lock, Pause, Play, RotateCcw, Swords, Unlock, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { WINNER_MESSAGES, pick } from '../game/copy'
import { useActions, useGame } from '../game/GameContext'
import { OPTION_LETTERS, leaders, rankTeams, teamById, winner } from '../game/logic'
import type { TeamId } from '../game/types'
import { WarningTape } from './Background'
import { Leaderboard } from './Leaderboard'
import { TimerDisplay } from './Timer'
import { PixelSkull, useUI } from './ui'

/** After round 6: review the table before locking it in. */
export function Finalize() {
  const actions = useActions()
  const ui = useUI()

  const lock = async () => {
    const ok = await ui.confirm({
      title: 'Lock final scores?',
      body: 'The winner is declared from these scores. You can unlock later if you spot a mistake.',
      confirmLabel: 'Lock scores and reveal winner',
    })
    if (ok) actions.finalize()
  }

  return (
    <div className="flex h-full flex-col gap-[2vh] px-[6vw] py-[3vh]">
      <header>
        <p className="font-pixel text-3xl text-pink">ALL SIX ROUNDS CLEARED</p>
        <h1 className="text-[clamp(2.2rem,4.6vw,4.8rem)] font-bold leading-none tracking-tight">Check the scores before the reveal</h1>
      </header>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto pr-2">
        <Leaderboard />
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <button className="btn btn-ghost" onClick={() => actions.setPhase('arena')}>
            <ArrowLeft size={18} /> Back to round 6
          </button>
          <button className="btn btn-ghost" onClick={() => ui.open('adjust')}>
            <Wrench size={18} /> Fix scores
          </button>
          <button className="btn btn-ghost" onClick={() => ui.open('history')}>
            <History size={18} /> Score log
          </button>
        </div>
        <button className="btn btn-acid px-8 text-2xl" onClick={lock} autoFocus>
          <Lock size={24} /> Lock scores and reveal winner
        </button>
      </footer>
    </div>
  )
}

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        i,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        dur: 2.5 + Math.random() * 2.5,
        size: 8 + Math.random() * 12,
        color: ['#c6ff00', '#ff2bd6', '#9d4dff', '#00f0ff', '#ff8a00'][i % 5],
        spin: Math.random() > 0.5 ? 360 : -360,
      })),
    [],
  )
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      {bits.map((b) => (
        <motion.div
          key={b.i}
          className="absolute top-0"
          style={{ left: `${b.left}%`, width: b.size, height: b.size, background: b.color }}
          initial={{ y: '-10vh', rotate: 0 }}
          animate={{ y: '110vh', rotate: b.spin }}
          transition={{ duration: b.dur, delay: b.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

const PODIUM_HEIGHT = ['h-[34vh]', 'h-[24vh]', 'h-[17vh]']

export function WinnerScreen() {
  const state = useGame()
  const actions = useActions()
  const ui = useUI()
  const ranked = rankTeams(state.teams, state.scores)
  const champ = winner(state)
  const tied = leaders(state)
  const [coChamps, setCoChamps] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const isTie = !champ && !coChamps

  useEffect(() => {
    if (isTie) return
    const id = window.setTimeout(() => {
      setRevealed(true)
      actions.sfx('winner')
    }, 1800)
    return () => window.clearTimeout(id)
  }, [isTie, actions])

  const playAgain = async () => {
    const ok = await ui.confirm({
      title: 'Play again?',
      body: 'All scores and the score log are wiped. Questions, teams and settings stay.',
      confirmLabel: 'Wipe and return to lobby',
      danger: true,
    })
    if (ok) actions.playAgain()
  }

  const unlock = async () => {
    const ok = await ui.confirm({
      title: 'Unlock scores?',
      body: 'Returns to round 6 so you can fix mistakes. The winner will be revealed again when you lock.',
      confirmLabel: 'Unlock scores',
    })
    if (ok) actions.reopen()
  }

  const footer = (
    <footer className="flex flex-wrap items-center justify-center gap-3">
      <button className="btn btn-ghost" onClick={unlock}>
        <Unlock size={18} /> Unlock scores
      </button>
      <button className="btn btn-purple text-xl" onClick={() => ui.open('history')}>
        <History size={20} /> Review scores
      </button>
      <button className="btn btn-acid text-xl" onClick={playAgain}>
        <RotateCcw size={20} /> Play again
      </button>
    </footer>
  )

  if (isTie) {
    return (
      <div className="flex h-full flex-col">
        <WarningTape text="TIE DETECTED · SIMULATION CONFUSED" tone="danger" />
        <div className="flex flex-1 flex-col items-center justify-center gap-[3vh] px-[4vw] text-center">
          <motion.h1
            className="glitch text-[clamp(4rem,10vw,11rem)] font-bold leading-[0.85] tracking-[-0.05em] text-pink"
            data-text="IT'S A TIE"
            initial={{ scale: 3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          >
            IT'S A TIE
          </motion.h1>
          <p className="text-2xl text-muted">The top spot is shared at {state.scores[tied[0]]} points.</p>
          <ul className="flex flex-wrap justify-center gap-4">
            {tied.map((id) => {
              const t = teamById(state, id)
              return (
                <li key={id} className="border-4 bg-void px-6 py-3 text-4xl font-bold hard" style={{ borderColor: t.color, color: t.color, ['--shadow' as string]: t.color }}>
                  {t.name}
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="btn btn-danger px-8 text-2xl" onClick={actions.startTiebreaker} autoFocus>
              <Swords size={26} /> Sudden death tiebreaker
            </button>
            <button className="btn btn-ghost text-xl" onClick={() => setCoChamps(true)}>
              <Crown size={20} /> Declare co-champions
            </button>
          </div>
          {footer}
        </div>
      </div>
    )
  }

  const champions: TeamId[] = champ ? [champ] : tied
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean)
  const rest = ranked.slice(3)

  return (
    <div className="flex h-full flex-col items-center gap-[2vh] px-[4vw] py-[2.5vh]">
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div
            key="drum"
            className="flex flex-1 flex-col items-center justify-center"
            exit={{ scale: 3, opacity: 0 }}
          >
            <PixelSkull size={100} className="shake" />
            <p className="mt-6 font-pixel text-6xl text-acid">AND THE WINNER IS<span className="blink">…</span></p>
            <button className="btn btn-ghost mt-8" onClick={() => setRevealed(true)}>
              Skip
            </button>
          </motion.div>
        ) : (
          <motion.div key="reveal" className="flex min-h-0 w-full flex-1 flex-col items-center gap-[2vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Confetti />
            <motion.div
              className="text-center"
              initial={{ scale: 4, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 12 }}
            >
              <p className="font-pixel text-3xl text-pink">
                {champions.length > 1 ? 'CO-CHAMPIONS' : state.tiebreakerWinner ? 'SUDDEN DEATH SURVIVOR' : 'CHAMPION'}
              </p>
              <h1 className="text-[clamp(3rem,7.5vw,8rem)] font-bold leading-[0.9] tracking-[-0.04em]">
                {champions.map((id) => (
                  <span key={id} className="glitch mx-3 inline-block" data-text={teamById(state, id).name} style={{ color: teamById(state, id).color }}>
                    {teamById(state, id).name}
                  </span>
                ))}
              </h1>
              <p className="mt-1 text-[clamp(1.4rem,2.6vw,2.8rem)] font-bold text-acid">{pick(WINNER_MESSAGES, state.history.length)}</p>
            </motion.div>

            <div className="flex w-full max-w-5xl flex-1 items-end justify-center gap-[1.5vw]" aria-label="Podium">
              {podium.map((entry, i) => {
                const place = [2, 1, 3][i] - 1
                return (
                  <motion.div
                    key={entry.team.id}
                    className="flex flex-1 flex-col items-center"
                    initial={{ y: 200, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', delay: 0.3 + (2 - place) * 0.25 }}
                  >
                    {entry.rank === 1 && <Crown size={48} className="mb-1 text-acid" fill="currentColor" />}
                    <span className="truncate text-center text-[clamp(1.3rem,2.2vw,2.4rem)] font-bold" style={{ color: entry.team.color }}>
                      {entry.team.name}
                    </span>
                    <div
                      className={`flex w-full flex-col items-center justify-start border-4 border-void pt-2 text-void ${PODIUM_HEIGHT[place]}`}
                      style={{ background: entry.team.color, boxShadow: '6px 6px 0 #000' }}
                    >
                      <span className="t-hud text-[clamp(3rem,6vw,7rem)]">{entry.score}</span>
                      <span className="font-pixel text-3xl">#{entry.rank}</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            {rest.length > 0 && (
              <ul className="flex gap-4" aria-label="Other places">
                {rest.map((r) => (
                  <li key={r.team.id} className="border-[3px] bg-void px-4 py-1 text-xl font-bold" style={{ borderColor: r.team.color }}>
                    #{r.rank} {r.team.name} · <span className="font-pixel text-2xl">{r.score}</span>
                  </li>
                ))}
              </ul>
            )}
            {footer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Tiebreaker() {
  const state = useGame()
  const actions = useActions()
  const q = state.tiebreakerQuestion
  const tied = leaders(state)
  const revealed = state.tiebreakerReveal
  const running = state.timer.status === 'running'

  return (
    <div className="flex h-full flex-col gap-[2vh] px-[3vw] py-[2.5vh]">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PixelSkull size={52} color="var(--color-danger)" className="shake" />
          <h1 className="glitch text-[clamp(2.4rem,4.6vw,5rem)] font-bold leading-none tracking-tight text-danger" data-text="SUDDEN DEATH">
            SUDDEN DEATH
          </h1>
        </div>
        <TimerDisplay boss />
      </header>
      <section className="border-4 border-danger bg-void px-[2vw] py-[2vh] hard" style={{ ['--shadow' as string]: 'var(--color-danger)' }}>
        <p className="t-question">{q.text}</p>
      </section>
      <ol className="grid min-h-0 flex-1 grid-cols-2 gap-[1vw]">
        {q.options.map((opt, i) => {
          const good = revealed && i === q.correct
          return (
            <li
              key={i}
              className="flex items-center gap-3 border-4 px-4 py-2"
              style={{
                borderColor: good ? 'var(--color-acid)' : '#3a3350',
                background: good ? 'var(--color-acid)' : 'var(--color-char)',
                color: good ? 'var(--color-void)' : 'var(--color-paper)',
                opacity: revealed && !good ? 0.3 : 1,
              }}
            >
              <span className="t-hud text-5xl text-pink" style={good ? { color: 'var(--color-void)' } : undefined}>
                {OPTION_LETTERS[i]}
              </span>
              <span className="t-option">{opt}</span>
            </li>
          )
        })}
      </ol>
      {revealed && <p className="border-l-8 border-acid bg-acid/15 px-4 py-2 text-2xl font-semibold">{q.explanation}</p>}
      <footer className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => actions.setPhase('winner')}>
            <ArrowLeft size={18} /> Back
          </button>
          <button className={`btn ${running ? 'btn-pink' : 'btn-acid'}`} onClick={actions.timerToggle}>
            {running ? <Pause size={18} /> : <Play size={18} />} {running ? 'Pause timer' : 'Start timer'}
          </button>
          <button className="btn btn-ghost" onClick={actions.timerReset}>
            <RotateCcw size={18} /> Reset timer
          </button>
          <button className="btn btn-danger" onClick={actions.tiebreakerReveal} disabled={revealed}>
            <Eye size={18} /> Reveal answer
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold">First correct wins:</span>
          {tied.map((id) => {
            const t = teamById(state, id)
            return (
              <button key={id} className="btn text-lg" style={{ background: t.color, color: 'var(--color-void)', borderColor: 'var(--color-void)' }} onClick={() => actions.tiebreakerWin(id)}>
                <Crown size={18} /> {t.name}
              </button>
            )
          })}
        </div>
      </footer>
    </div>
  )
}
