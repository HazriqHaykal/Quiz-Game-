import { Minus, Plus, RotateCcw, Trash2, Undo2, Volume2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useActions, useGame } from '../game/GameContext'
import { BASE_POINTS, CLUE_POINTS, teamById } from '../game/logic'
import { clearSavedState } from '../game/storage'
import type { Settings, TeamId } from '../game/types'
import { Leaderboard } from './Leaderboard'
import { useUI } from './ui'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 border-b-2 border-char-2 pb-1 text-xl font-bold text-acid">{title}</h3>
      {children}
    </section>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-lg font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-16 shrink-0 border-[3px] transition-colors ${checked ? 'border-void bg-acid' : 'border-[#3a3350] bg-void'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 transition-all ${checked ? 'left-8 bg-void' : 'left-1 bg-muted'}`} />
        <span className="sr-only">{label}</span>
      </button>
    </label>
  )
}

function MembersField({ teamId }: { teamId: TeamId }) {
  const state = useGame()
  const actions = useActions()
  const team = teamById(state, teamId)
  const [text, setText] = useState(team.members.join('\n'))
  const commit = () => {
    const members = text
      .split('\n')
      .map((m) => m.trim())
      .filter(Boolean)
    actions.updateTeam(teamId, { members })
    setText(members.join('\n'))
  }
  return (
    <textarea
      aria-label={`${team.name} members, one per line`}
      rows={5}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      className="w-full resize-y text-base"
    />
  )
}

export function SettingsPanel() {
  const state = useGame()
  const actions = useActions()
  const ui = useUI()
  const s = state.settings
  const set = (patch: Partial<Settings>) => actions.updateSettings(patch)
  const mult = s.finalDoublePoints ? 2 : 1

  const factoryReset = async () => {
    const ok = await ui.confirm({
      title: 'Erase everything?',
      body: 'Deletes saved scores, edited questions, team names and settings from this browser. This cannot be undone.',
      confirmLabel: 'Erase all saved data',
      danger: true,
    })
    if (!ok) return
    clearSavedState()
    window.location.reload()
  }

  return (
    <div className="grid gap-x-8 md:grid-cols-2">
      <div>
        <Section title="Sound">
          <Toggle label="Sound effects" hint="Synthesized in the browser, no files needed." checked={s.soundEnabled} onChange={(v) => set({ soundEnabled: v })} />
          <label className="flex items-center gap-3 py-2">
            <span className="w-28 text-lg font-semibold">Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.volume}
              onChange={(e) => set({ volume: Number(e.target.value) })}
              className="flex-1 accent-[#c6ff00]"
              aria-label="Master volume"
            />
            <span className="w-12 text-right font-pixel text-2xl">{Math.round(s.volume * 100)}</span>
            <button className="btn btn-ghost !p-1.5" onClick={() => actions.sfx('correct')} aria-label="Test sound">
              <Volume2 size={18} />
            </button>
          </label>
        </Section>

        <Section title="Timer and scoring">
          <label className="flex items-center justify-between gap-3 py-2">
            <span className="text-lg font-semibold">Seconds per question</span>
            <input type="number" min={3} max={120} value={s.timerSeconds} onChange={(e) => set({ timerSeconds: Number(e.target.value) })} className="w-24 text-right" />
          </label>
          <p className="py-1 text-muted">
            Correct without clue <b className="text-paper">+{BASE_POINTS}</b>, after a clue <b className="text-paper">+{CLUE_POINTS}</b>, wrong <b className="text-paper">+0</b>.
          </p>
          <Toggle label="Allow steal opportunities" hint="Adds an Enable steal control. You open the window manually each round." checked={s.allowSteals} onChange={(v) => set({ allowSteals: v })} />
          {s.allowSteals && (
            <label className="flex items-center justify-between gap-3 py-2">
              <span className="text-lg font-semibold">Points per steal</span>
              <input type="number" min={1} max={5} value={s.stealPoints} onChange={(e) => set({ stealPoints: Number(e.target.value) })} className="w-24 text-right" />
            </label>
          )}
          <Toggle
            label="Double points in the final boss round"
            hint={`Round 6 is worth +${BASE_POINTS * mult} / +${CLUE_POINTS * mult}. Shown on screen before the round.`}
            checked={s.finalDoublePoints}
            onChange={(v) => set({ finalDoublePoints: v })}
          />
        </Section>

        <Section title="Motion">
          <div className="flex gap-2 py-2" role="radiogroup" aria-label="Animation level">
            {(['auto', 'full', 'reduced'] as const).map((m) => (
              <button key={m} role="radio" aria-checked={s.motion === m} className={`btn ${s.motion === m ? 'btn-acid' : 'btn-ghost'}`} onClick={() => set({ motion: m })}>
                {m === 'auto' ? 'Follow system' : m === 'full' ? 'Full chaos' : 'Reduced'}
              </button>
            ))}
          </div>
          <Toggle label="Skip the boot intro" checked={s.skipIntro} onChange={(v) => set({ skipIntro: v })} />
        </Section>
      </div>

      <div>
        <Section title="Teams and members">
          <p className="mb-3 text-sm text-muted">Members feed the representative rotation. One name per line; changes save when you leave the box.</p>
          <div className="flex flex-col gap-4">
            {state.teams.map((t) => (
              <div key={t.id} className="border-l-4 pl-3" style={{ borderColor: t.color }}>
                <input
                  aria-label={`Team name for ${t.name}`}
                  value={t.name}
                  onChange={(e) => actions.updateTeam(t.id, { name: e.target.value })}
                  className="mb-2 w-full text-lg font-bold"
                  style={{ color: t.color }}
                />
                <MembersField key={t.members.join('|')} teamId={t.id} />
              </div>
            ))}
          </div>
          <button className="btn btn-ghost mt-4" onClick={actions.resetTeams}>
            <RotateCcw size={16} /> Reset team names and members
          </button>
        </Section>

        <Section title="Danger zone">
          <button className="btn btn-danger" onClick={factoryReset}>
            <Trash2 size={16} /> Erase all saved data
          </button>
        </Section>
      </div>
    </div>
  )
}

export function AdjustPanel() {
  const state = useGame()
  const actions = useActions()
  const [amount, setAmount] = useState<Record<string, string>>({})

  return (
    <div>
      <p className="mb-4 text-muted">
        Manual corrections are logged and can be undone like any other score change.
        {state.finalized && <b className="text-pink"> Scores are locked. Unlock them from the winner screen first.</b>}
      </p>
      <ul className="flex flex-col gap-3">
        {state.teams.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-3 border-l-4 bg-void px-3 py-2" style={{ borderColor: t.color }}>
            <span className="min-w-36 flex-1 text-xl font-bold" style={{ color: t.color }}>
              {t.name}
            </span>
            <span className="t-hud w-16 text-right text-5xl">{state.scores[t.id]}</span>
            <button className="btn btn-ghost !p-2" onClick={() => actions.adjust(t.id, -1)} aria-label={`Minus one point for ${t.name}`} disabled={state.finalized}>
              <Minus size={18} />
            </button>
            <button className="btn btn-acid !p-2" onClick={() => actions.adjust(t.id, 1)} aria-label={`Plus one point for ${t.name}`} disabled={state.finalized}>
              <Plus size={18} />
            </button>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const target = Number(amount[t.id])
                if (amount[t.id] === undefined || amount[t.id] === '' || !Number.isFinite(target)) return
                actions.adjust(t.id, Math.round(target) - state.scores[t.id], `Score set to ${Math.round(target)} for ${t.name}`)
                setAmount((a) => ({ ...a, [t.id]: '' }))
              }}
            >
              <input
                type="number"
                className="w-20"
                placeholder="Set"
                aria-label={`Set exact score for ${t.name}`}
                value={amount[t.id] ?? ''}
                onChange={(e) => setAmount((a) => ({ ...a, [t.id]: e.target.value }))}
                disabled={state.finalized}
              />
              <button className="btn btn-ghost !py-1.5" disabled={state.finalized}>
                Set
              </button>
            </form>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <button className="btn btn-ghost" onClick={actions.undo} disabled={!state.history.length || state.finalized}>
          <Undo2 size={18} /> Undo last change
        </button>
      </div>
    </div>
  )
}

export function HistoryPanel() {
  const state = useGame()
  const events = [...state.history].reverse()
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div>
        <h3 className="mb-3 text-xl font-bold text-acid">Standings</h3>
        <Leaderboard />
      </div>
      <div>
        <h3 className="mb-3 text-xl font-bold text-acid">Score log, newest first</h3>
        {events.length === 0 ? (
          <p className="text-muted">No score changes yet. Judge a representative in the arena to start the log.</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {events.map((e) => {
              const t = teamById(state, e.teamId)
              return (
                <li key={e.id} className="flex items-center gap-3 border-l-4 bg-void px-3 py-1.5" style={{ borderColor: t.color }}>
                  <span className="w-10 font-pixel text-xl text-muted">{e.round ? `R${e.round}` : '—'}</span>
                  <span className="flex-1">{e.note}</span>
                  <span className={`font-pixel text-2xl ${e.delta > 0 ? 'text-acid' : e.delta < 0 ? 'text-pink' : 'text-muted'}`}>
                    {e.delta > 0 ? `+${e.delta}` : e.delta}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

const SHORTCUTS: [string, string][] = [
  ['Space', 'Start / pause timer'],
  ['R', 'Reset timer'],
  ['C', 'Reveal clue'],
  ['A', 'Reveal answer'],
  ['1–5', 'Mark group correct (in on-screen order)'],
  ['Shift + 1–5', 'Mark group incorrect'],
  ['S', 'Open / close steal window'],
  ['U or Ctrl+Z', 'Undo last score change'],
  ['L', 'Leaderboard'],
  ['N / P', 'Next / previous round'],
  ['M', 'Mute / unmute'],
  ['Esc', 'Close any panel'],
]

export function HelpPanel() {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3 text-lg">
        <h3 className="text-xl font-bold text-acid">Running a round</h3>
        <ol className="list-decimal space-y-1.5 pl-6">
          <li>Pick a representative per group, or skip names.</li>
          <li>Enter the arena and start the timer.</li>
          <li>If nobody knows, reveal the clue. Correct answers now earn +1 instead of +2.</li>
          <li>Judge each group with the tick or cross. Each group can be judged once per question.</li>
          <li>Reveal the answer and explanation.</li>
          <li>Optionally open a steal window and award steal points.</li>
          <li>Go to the next round. Round 6 is the final boss.</li>
        </ol>
        <p className="text-muted">
          Tip: judge groups that answered before the clue first, because the tick awards the points shown at the moment you press it. Made a mistake? Undo, or use Fix scores.
        </p>
        <p className="text-muted">Everything saves automatically in this browser. Refreshing the page puts you back where you were, with the timer paused.</p>
      </div>
      <div>
        <h3 className="mb-3 text-xl font-bold text-acid">Keyboard shortcuts</h3>
        <table className="w-full text-left">
          <tbody>
            {SHORTCUTS.map(([k, v]) => (
              <tr key={k} className="border-b border-char-2">
                <td className="py-1.5 pr-4 font-pixel text-2xl text-pink">{k}</td>
                <td className="py-1.5">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
