import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, FastForward, Shuffle } from 'lucide-react'
import { useActions, useGame } from '../game/GameContext'
import { formatRound, isFinalRound, isRepeat, usedMembers } from '../game/logic'
import { RoundTrack } from './Lobby'

export function RepSelection() {
  const state = useGame()
  const actions = useActions()
  const round = state.rounds[state.round - 1]
  const boss = isFinalRound(state.round)
  const allChosen = state.teams.every((t) => !!round.reps[t.id])

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
          const chosen = round.reps[team.id] ?? ''
          const repeat = isRepeat(state, team.id, chosen)
          return (
            <motion.section
              key={team.id}
              aria-label={`${team.name} representative`}
              className="scroll-thin flex min-h-0 flex-col gap-2 overflow-y-auto border-4 bg-void p-3 hard-sm"
              style={{ borderColor: team.color, ['--shadow' as string]: team.color }}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <h2 className="truncate text-2xl font-bold" style={{ color: team.color }}>
                {team.name}
              </h2>
              <div className="flex flex-col gap-1.5">
                {team.members.map((m, idx) => {
                  const played = used.includes(idx)
                  const selected = chosen === m
                  return (
                    <button
                      key={`${m}-${idx}`}
                      className={`flex items-center justify-between gap-2 border-2 px-2 py-1 text-left text-lg font-semibold transition-colors ${
                        selected
                          ? 'border-void text-void'
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
                      {selected && <Check size={18} className="shrink-0" />}
                    </button>
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
        <button className="btn btn-ghost" onClick={actions.goLobby}>
          <ArrowLeft size={18} /> Lobby
        </button>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-purple" onClick={actions.randomPickReps}>
            <Shuffle size={18} /> Random pick
          </button>
          <button className="btn btn-ghost" onClick={actions.skipReps}>
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
