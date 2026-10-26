import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Undo2,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import {
  CLUE_REACTIONS,
  CORRECT_REACTIONS,
  INCORRECT_REACTIONS,
  REVEAL_REACTIONS,
  STEAL_REACTIONS,
  TIMES_UP,
  pick,
} from '../game/copy'
import { useActions, useGame } from '../game/GameContext'
import {
  OPTION_LETTERS,
  currentQuestion,
  currentRound,
  formatRound,
  isFinalRound,
  pointValue,
} from '../game/logic'
import { TEAM_IDS, TOTAL_ROUNDS, type Mark, type TeamId } from '../game/types'
import { AnimatedScore } from './Leaderboard'
import { ReactionStamp, useReaction } from './Reaction'
import { CountdownFlash, TimerDisplay } from './Timer'
import { K, PixelSkull, useUI } from './ui'

export function Arena() {
  const state = useGame()
  const actions = useActions()
  const ui = useUI()
  const round = currentRound(state)
  const q = currentQuestion(state)
  const boss = isFinalRound(state.round)
  const points = pointValue(state)
  const [reaction, react] = useReaction()
  const seed = state.round * 7 + state.history.length

  // Time's up → meme stamp, once per expiry.
  const prevStatus = useRef(state.timer.status)
  useEffect(() => {
    if (state.timer.status === 'expired' && prevStatus.current === 'running') react(pick(TIMES_UP, seed), 'danger')
    prevStatus.current = state.timer.status
  }, [state.timer.status, react, seed])

  const doClue = () => {
    if (round.clueRevealed) return
    actions.revealClue()
    react(pick(CLUE_REACTIONS, seed), 'purple')
  }

  const doReveal = () => {
    if (round.answerRevealed) return
    actions.revealAnswer()
    const marks = Object.values(round.marks)
    const anyCorrect = marks.includes('correct')
    const allWrong = marks.length === TEAM_IDS.length && !anyCorrect
    if (anyCorrect) react(pick(CORRECT_REACTIONS, seed), 'acid', boss)
    else if (allWrong) react(pick(INCORRECT_REACTIONS, seed), 'pink', boss)
    else react(pick(REVEAL_REACTIONS, seed), 'cyan', boss)
  }

  const doMark = (teamId: TeamId, mark: Mark) => {
    if (round.marks[teamId] || state.finalized) return
    actions.mark(teamId, mark)
    react(mark === 'correct' ? pick(CORRECT_REACTIONS, seed + 1) : pick(INCORRECT_REACTIONS, seed + 1), mark === 'correct' ? 'acid' : 'pink')
  }

  const doSteal = (teamId: TeamId) => {
    if (!round.stealEnabled || round.steals[teamId] || round.marks[teamId] === 'correct') return
    actions.steal(teamId)
    react(pick(STEAL_REACTIONS, seed), 'cyan')
  }

  const doNext = async () => {
    if (state.round === TOTAL_ROUNDS) {
      actions.nextRound()
      return
    }
    if (!round.answerRevealed) {
      const ok = await ui.confirm({
        title: 'Answer not revealed yet',
        body: 'Move to the next round anyway? You can come back with Previous round.',
        confirmLabel: 'Go to next round',
      })
      if (!ok) return
    }
    actions.nextRound()
  }

  // Keyboard shortcuts for one-handed hosting.
  const handlers = useRef({ doClue, doReveal, doMark, doSteal, doNext })
  handlers.current = { doClue, doReveal, doMark, doSteal, doNext }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui.busy) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select')) return
      const h = handlers.current
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        actions.undo()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const digit = /^Digit([1-5])$/.exec(e.code)
      if (digit) {
        const team = TEAM_IDS[Number(digit[1]) - 1]
        h.doMark(team, e.shiftKey ? 'incorrect' : 'correct')
        return
      }
      switch (e.key.toLowerCase()) {
        case ' ':
          if (t.tagName === 'BUTTON') return
          e.preventDefault()
          actions.timerToggle()
          break
        case 'r':
          actions.timerReset()
          break
        case 'c':
          h.doClue()
          break
        case 'a':
          h.doReveal()
          break
        case 's':
          actions.toggleSteal()
          break
        case 'u':
          actions.undo()
          break
        case 'l':
          ui.open('leaderboard')
          break
        case 'n':
          void h.doNext()
          break
        case 'p':
          actions.prevRound()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actions, ui])

  const timerRunning = state.timer.status === 'running'
  const accent = boss ? 'var(--color-danger)' : 'var(--color-acid)'

  return (
    <div className="grid h-full grid-cols-[1fr_minmax(330px,27vw)] grid-rows-[auto_1fr_auto] gap-x-[1.4vw] gap-y-[1.6vh] px-[1.6vw] py-[1.6vh]">
      {/* ── Header ───────────────────────────── */}
      <header className="col-span-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {boss ? (
            <motion.div className="flex items-center gap-3" animate={{ x: [0, -2, 2, 0] }} transition={{ repeat: Infinity, duration: 0.3, repeatDelay: 2 }}>
              <PixelSkull size={52} color="var(--color-danger)" />
              <h1 className="glitch text-[clamp(2rem,3.6vw,3.8rem)] font-bold leading-none tracking-tight text-danger" data-text="FINAL BOSS">
                FINAL BOSS
              </h1>
            </motion.div>
          ) : (
            <h1 className="t-hud text-[clamp(2.6rem,4.6vw,5rem)] text-acid">ROUND {formatRound(state.round)}</h1>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-xl font-bold">{q.topic}</span>
            <span className="text-base text-muted">
              {boss ? `Round ${formatRound(state.round)}` : 'Representatives, lock in.'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            key={points}
            initial={{ scale: 1.5, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            className="flex flex-col items-center border-4 border-void px-3 py-1 text-void hard-sm"
            style={{ background: round.clueRevealed ? 'var(--color-purple)' : accent }}
            aria-label={`Worth ${points} points${round.clueRevealed ? ', clue used' : ''}`}
          >
            <span className="t-hud text-5xl">+{points}</span>
            <span className="text-xs font-bold">{round.clueRevealed ? 'CLUE USED' : 'NO CLUE'}</span>
          </motion.div>
          <TimerDisplay boss={boss} />
        </div>
      </header>

      {/* ── Question + options ───────────────── */}
      <main className="flex min-h-0 flex-col gap-[1.6vh]">
        <motion.section
          key={`q-${state.round}`}
          className="relative border-4 bg-void px-[2vw] py-[2.2vh] hard"
          style={{ borderColor: accent, ['--shadow' as string]: boss ? 'var(--color-danger)' : 'var(--color-purple)' }}
          initial={{ opacity: 0, y: 30, skewX: -4 }}
          animate={{ opacity: 1, y: 0, skewX: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          aria-label="Question"
        >
          <p className="t-question">{q.text}</p>
        </motion.section>

        <ol className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-[1vw]" aria-label="Options">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correct
            const revealed = round.answerRevealed
            return (
              <motion.li
                key={`${state.round}-${i}`}
                className="relative flex min-h-0 items-center gap-[1vw] border-4 px-[1vw] py-[1vh]"
                initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
                animate={{
                  opacity: revealed && !isCorrect ? 0.28 : 1,
                  x: 0,
                  scale: revealed && isCorrect ? 1.02 : 1,
                }}
                transition={{ delay: revealed ? 0 : 0.1 + i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
                style={{
                  borderColor: revealed && isCorrect ? 'var(--color-acid)' : '#3a3350',
                  background: revealed && isCorrect ? 'var(--color-acid)' : 'var(--color-char)',
                  color: revealed && isCorrect ? 'var(--color-void)' : 'var(--color-paper)',
                  boxShadow: revealed && isCorrect ? '0 0 40px rgba(198,255,0,0.55), 6px 6px 0 #000' : '4px 4px 0 #000',
                }}
              >
                <span
                  className="t-hud flex aspect-square h-[min(8vh,4.5vw)] shrink-0 items-center justify-center border-[3px] text-[min(6vh,3.4vw)]"
                  style={{
                    borderColor: revealed && isCorrect ? 'var(--color-void)' : 'var(--color-pink)',
                    color: revealed && isCorrect ? 'var(--color-void)' : 'var(--color-pink)',
                  }}
                >
                  {OPTION_LETTERS[i]}
                </span>
                <span className="t-option">{opt}</span>
                {revealed && isCorrect && (
                  <motion.span
                    className="absolute -top-4 -right-3 flex items-center gap-1 border-[3px] border-void bg-pink px-2 py-0.5 text-lg font-bold text-void"
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 6 }}
                  >
                    <Check size={18} strokeWidth={4} /> CORRECT
                  </motion.span>
                )}
              </motion.li>
            )
          })}
        </ol>

        <div className="flex flex-col gap-2" aria-live="polite">
          <AnimatePresence>
            {round.clueRevealed && (
              <motion.div
                key="clue"
                className="flex items-start gap-3 border-l-8 border-purple bg-purple/20 px-4 py-2"
                initial={{ opacity: 0, x: -80, skewX: -20 }}
                animate={{ opacity: 1, x: 0, skewX: 0 }}
                exit={{ opacity: 0 }}
              >
                <Lightbulb className="mt-1 shrink-0 text-purple" size={26} />
                <p className="text-[clamp(1.05rem,1.6vw,1.8rem)] font-semibold">
                  <span className="font-pixel text-[1.15em] text-purple">CLUE:</span> {q.clue}
                </p>
              </motion.div>
            )}
            {round.answerRevealed && (
              <motion.div
                key="explain"
                className="flex items-start gap-3 border-l-8 border-acid bg-acid/15 px-4 py-2"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Eye className="mt-1 shrink-0 text-acid" size={26} />
                <p className="text-[clamp(1.05rem,1.6vw,1.8rem)] font-semibold">
                  <span className="font-pixel text-[1.15em] text-acid">ANSWER {OPTION_LETTERS[q.correct]}:</span> {q.explanation}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── Teams / judging ──────────────────── */}
      <aside className="flex min-h-0 flex-col gap-[1vh]" aria-label="Teams and judging">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Judge the reps</h2>
          {round.stealEnabled && (
            <span className="blink font-pixel text-xl text-cyan">STEAL WINDOW OPEN</span>
          )}
        </div>
        {state.teams.map((team, idx) => {
          const mark = round.marks[team.id]
          const stolen = round.steals[team.id]
          const rep = round.repsConfirmed ? round.reps[team.id] : null
          const canSteal = round.stealEnabled && !stolen && mark !== 'correct'
          return (
            <div
              key={team.id}
              className="relative flex min-h-0 flex-1 items-center gap-2 border-[3px] bg-void px-2 py-1"
              style={{ borderColor: mark === 'correct' ? team.color : '#3a3350' }}
            >
              <div className="h-full w-2 shrink-0" style={{ background: team.color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[clamp(1rem,1.35vw,1.5rem)] font-bold" style={{ color: team.color }}>
                  {team.name}
                </div>
                <div className="truncate text-sm text-muted">{rep ?? 'Rep not named'}</div>
              </div>
              <AnimatedScore value={state.scores[team.id]} className="t-hud min-w-[2ch] justify-end text-[clamp(2.4rem,3.6vw,4rem)]" />
              <div className="flex shrink-0 flex-col gap-1">
                {mark ? (
                  <motion.span
                    initial={{ scale: 2, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className={`flex w-[6.5rem] items-center justify-center gap-1 border-2 px-1 py-1 text-sm font-bold ${
                      mark === 'correct' ? 'border-void bg-acid text-void' : 'border-pink text-pink'
                    }`}
                  >
                    {mark === 'correct' ? <Check size={16} strokeWidth={4} /> : <X size={16} strokeWidth={4} />}
                    {mark === 'correct' ? 'CORRECT' : 'WRONG'}
                  </motion.span>
                ) : (
                  <div className="flex gap-1">
                    <button
                      className="btn btn-acid !px-2 !py-1 text-sm"
                      onClick={() => doMark(team.id, 'correct')}
                      aria-label={`Mark ${team.name} correct, plus ${points}`}
                      title={`Mark correct (+${points}) · key ${idx + 1}`}
                      disabled={state.finalized}
                    >
                      <Check size={16} strokeWidth={4} />+{points}
                    </button>
                    <button
                      className="btn btn-ghost !px-2 !py-1 text-sm"
                      onClick={() => doMark(team.id, 'incorrect')}
                      aria-label={`Mark ${team.name} incorrect`}
                      title={`Mark incorrect · Shift+${idx + 1}`}
                      disabled={state.finalized}
                    >
                      <X size={16} strokeWidth={4} />
                    </button>
                  </div>
                )}
                {(round.stealEnabled || stolen) && (
                  <button
                    className="btn !border-cyan !px-2 !py-0.5 text-xs text-cyan"
                    disabled={!canSteal || state.finalized}
                    onClick={() => doSteal(team.id)}
                    aria-label={`Award steal point to ${team.name}`}
                  >
                    <Zap size={14} /> {stolen ? 'STOLEN' : `STEAL +${state.settings.stealPoints}`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </aside>

      {/* ── Host control bar ─────────────────── */}
      <nav className="col-span-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t-4 border-char-2 pt-[1.2vh]" aria-label="Host controls">
        <div className="flex flex-wrap gap-2">
          <button className={`btn ${timerRunning ? 'btn-pink' : 'btn-acid'}`} onClick={actions.timerToggle}>
            {timerRunning ? <Pause size={18} /> : <Play size={18} />}
            {timerRunning ? 'Pause timer' : state.timer.status === 'paused' ? 'Resume timer' : state.timer.status === 'expired' ? 'Restart timer' : 'Start timer'}
            <K>Space</K>
          </button>
          <button className="btn btn-ghost" onClick={actions.timerReset}>
            <RotateCcw size={18} /> Reset timer<K>R</K>
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-purple" onClick={doClue} disabled={round.clueRevealed}>
            <Lightbulb size={18} /> {round.clueRevealed ? 'Clue revealed' : 'Reveal clue'}
            <K>C</K>
          </button>
          <button className={`btn ${boss ? 'btn-danger' : 'btn-acid'}`} onClick={doReveal} disabled={round.answerRevealed}>
            <Eye size={18} /> {round.answerRevealed ? 'Answer revealed' : 'Reveal answer'}
            <K>A</K>
          </button>
          {state.settings.allowSteals && (
            <button
              className={`btn ${round.stealEnabled ? '!bg-cyan !text-void' : 'btn-ghost'}`}
              onClick={actions.toggleSteal}
              aria-pressed={round.stealEnabled}
            >
              <Zap size={18} /> {round.stealEnabled ? 'Close steal' : 'Enable steal'}
              <K>S</K>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={actions.undo} disabled={!state.history.length || state.finalized} title="Undo last score change">
            <Undo2 size={18} /> Undo<K>U</K>
          </button>
          <button className="btn btn-ghost" onClick={() => ui.open('adjust')}>
            <Wrench size={18} /> Fix scores
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={actions.prevRound} disabled={state.round <= 1}>
            <ChevronLeft size={18} /> Previous<K>P</K>
          </button>
          <button className={`btn ${round.answerRevealed ? (boss ? 'btn-danger' : 'btn-pink') : 'btn-ghost'}`} onClick={() => void doNext()}>
            {state.round === TOTAL_ROUNDS ? 'Finish game' : 'Next round'} <ChevronRight size={18} />
            <K>N</K>
          </button>
        </div>
      </nav>

      <CountdownFlash boss={boss} />
      <ReactionStamp msg={reaction} />
    </div>
  )
}
