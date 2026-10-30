import { motion, useReducedMotionConfig } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, FastForward, Shuffle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useActions, useGame } from '../game/GameContext'
import { formatRound, isFinalRound, isRepeat, randomRep, usedMembers } from '../game/logic'
import { TEAM_IDS, type TeamId } from '../game/types'
import { RoundTrack } from './Lobby'

/** Name currently shown by the slot-machine spin for each team, and whether it has landed. */
type Spin = Partial<Record<TeamId, { name: string | null; locked: boolean }>>

const SPIN_MS = 1400
const LOCK_STAGGER_MS = 280

export function RepSelection() {
  const state = useGame()
  const actions = useActions()
  const reduceMotion = useReducedMotionConfig()
  const round = state.rounds[state.round - 1]
  const boss = isFinalRound(state.round)
  const [spin, setSpin] = useState<Spin | null>(null)
  const spinTimer = useRef<number | undefined>(undefined)
  const allChosen = !spin && state.teams.every((t) => !!round.reps[t.id])

  useEffect(() => () => window.clearTimeout(spinTimer.current), [])

  function randomPick() {
    if (spin) return
    const rolls = Object.fromEntries(TEAM_IDS.map((id) => [id, Math.random()])) as Record<TeamId, number>
    if (reduceMotion) {
      actions.sfx('clue')
      actions.randomPickReps(rolls)
      return
    }

    const finals = Object.fromEntries(TEAM_IDS.map((id) => [id, randomRep(state, id, rolls[id])]))
    const pools = Object.fromEntries(
      state.teams.map((t) => {
        const used = usedMembers(state, t.id)
        return [t.id, t.members.filter((_, i) => !used.includes(i))]
      }),
    )
    const stopAt = Object.fromEntries(TEAM_IDS.map((id, i) => [id, SPIN_MS + i * LOCK_STAGGER_MS]))
    const total = SPIN_MS + (TEAM_IDS.length - 1) * LOCK_STAGGER_MS
    const start = performance.now()
    let current: Spin = {}

    const tick = () => {
      const elapsed = performance.now() - start
      const next: Spin = {}
      let landed = false
      for (const id of TEAM_IDS) {
        const prev = current[id]
        if (prev?.locked) {
          next[id] = prev
        } else if (elapsed >= stopAt[id]) {
          next[id] = { name: finals[id], locked: true }
          landed = true
        } else {
          const pool = pools[id].length > 1 ? pools[id].filter((m) => m !== prev?.name) : pools[id]
          next[id] = { name: pool[Math.floor(Math.random() * pool.length)] ?? null, locked: false }
        }
      }
      current = next
      setSpin(next)
      actions.sfx(landed ? 'clue' : 'tick')

      if (TEAM_IDS.every((id) => next[id]?.locked)) {
        spinTimer.current = window.setTimeout(() => {
          actions.randomPickReps(rolls)
          setSpin(null)
        }, 500)
        return
      }
      // Ease out: ticks get slower as the spin winds down.
      const progress = Math.min(elapsed / total, 1)
      spinTimer.current = window.setTimeout(tick, 55 + 220 * progress * progress)
    }
    tick()
  }

  return (
    <div className="flex h-full flex-col gap-[2vh] px-[3vw] py-[3vh]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-pixel text-3xl text-pink">ROUND {formatRound(state.round)}</p>
          <h1 className="text-[clamp(2rem,4.4vw,4.6rem)] font-bold leading-none tracking-tight">
            {boss ? 'Send your final champions' : 'Who is locking in?'}
          </h1>
          <p className="mt-2 text-lg text-muted">
            Pick one representative per group. Members who already played this cycle are crossed out until everyone has had a turn.
          </p>
        </div>
        <RoundTrack current={state.round} />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-5 gap-[1vw]">
        {state.teams.map((team, i) => {
          const used = usedMembers(state, team.id)
          const teamSpin = spin?.[team.id]
          const chosen = (teamSpin ? teamSpin.name : round.reps[team.id]) ?? ''
          const repeat = !spin && isRepeat(state, team.id, chosen)
          return (
            <motion.section
              key={team.id}
              aria-label={`${team.name} representative`}
              className={`scroll-thin flex min-h-0 flex-col gap-2 overflow-y-auto border-4 bg-void p-3 hard-sm ${spin ? 'pointer-events-none' : ''}`}
              style={{ borderColor: team.color, ['--shadow' as string]: team.color }}
              initial={{ y: 30, opacity: 0 }}
              animate={teamSpin?.locked ? { y: [0, -10, 0], opacity: 1 } : { y: 0, opacity: 1 }}
              transition={teamSpin?.locked ? { duration: 0.3 } : { delay: i * 0.05 }}
            >
              <h2 className="truncate text-2xl font-bold" style={{ color: team.color }}>
                {team.name}
              </h2>
              <div className="flex flex-col gap-1.5">
                {team.members.map((m, idx) => {
                  const played = used.includes(idx)
                  const selected = chosen === m
                  const landed = selected && !!teamSpin?.locked
                  return (
                    <motion.button
                      key={`${m}-${idx}`}
                      animate={landed ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                      transition={{ duration: 0.35 }}
                      className={`flex items-center justify-between gap-2 border-2 px-2 py-1 text-left text-lg font-semibold transition-colors ${
                        selected
                          ? `border-void text-void ${teamSpin && !teamSpin.locked ? 'opacity-80' : ''}`
                          : played
                            ? 'border-[#3a3350] text-muted line-through'
                            : 'border-[#3a3350] hover:border-paper'
                      }`}
                      style={selected ? { background: team.color } : undefined}
                      onClick={() => actions.setRep(team.id, selected ? null : m)}
                      aria-pressed={selected}
                    >
                      <span className="truncate">{m}</span>
                      {played && !selected && <span className="shrink-0 text-xs no-underline">played</span>}
                      {selected && (!teamSpin || teamSpin.locked) && <Check size={18} className="shrink-0" />}
                    </motion.button>
                  )
                })}
              </div>
              <label className="mt-auto flex flex-col gap-1 text-sm text-muted">
                Or type a name
                <input
                  value={team.members.includes(chosen) ? '' : chosen}
                  placeholder="Custom name"
                  onChange={(e) => actions.setRep(team.id, e.target.value || null)}
                />
              </label>
              {repeat && (
                <p className="flex items-center gap-1 text-sm font-semibold text-pink">
                  <AlertTriangle size={16} /> Already played this cycle
                </p>
              )}
            </motion.section>
          )
        })}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <button className="btn btn-ghost" onClick={actions.goLobby} disabled={!!spin}>
          <ArrowLeft size={18} /> Lobby
        </button>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-purple" onClick={randomPick} disabled={!!spin}>
            <Shuffle size={18} className={spin ? 'animate-spin' : undefined} /> {spin ? 'Picking…' : 'Random pick'}
          </button>
          <button className="btn btn-ghost" onClick={actions.skipReps} disabled={!!spin}>
            <FastForward size={18} /> Skip names
          </button>
          <button className="btn btn-acid px-6 text-xl" onClick={actions.confirmReps} disabled={!allChosen} title={allChosen ? undefined : 'Pick a representative for every group, or skip names'}>
            <Check size={22} /> Lock in representatives
          </button>
        </div>
      </footer>
    </div>
  )
}
