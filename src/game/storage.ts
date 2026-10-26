import { emptyRound } from './defaults'
import { STATE_VERSION, freshTimer, initialState } from './reducer'
import type { GameState, Question, Team } from './types'
import { TEAM_IDS, TOTAL_ROUNDS } from './types'

export const STORAGE_KEY = 'crack-the-ethics-code:v1'

function isQuestion(q: unknown): q is Question {
  if (!q || typeof q !== 'object') return false
  const o = q as Record<string, unknown>
  return (
    typeof o.text === 'string' &&
    Array.isArray(o.options) &&
    o.options.length === 4 &&
    o.options.every((x) => typeof x === 'string') &&
    typeof o.correct === 'number' &&
    o.correct >= 0 &&
    o.correct <= 3
  )
}

/**
 * Loads saved state, falling back to defaults for anything missing or malformed,
 * so a corrupted save can never brick the game in front of a class.
 */
export function loadState(): GameState {
  const base = initialState()
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return base
  }
  if (!raw) return base
  try {
    const saved = JSON.parse(raw) as Partial<GameState>
    if (saved.version !== STATE_VERSION) return base

    const settings = { ...base.settings, ...saved.settings }
    const teams: Team[] = base.teams.map((t) => {
      const s = saved.teams?.find((x) => x.id === t.id)
      return s
        ? {
            ...t,
            name: typeof s.name === 'string' ? s.name : t.name,
            members: Array.isArray(s.members) ? s.members.filter((m) => typeof m === 'string') : t.members,
          }
        : t
    })
    const questions =
      Array.isArray(saved.questions) && saved.questions.length === TOTAL_ROUNDS && saved.questions.every(isQuestion)
        ? saved.questions.map((q, i) => ({ ...base.questions[i], ...q }))
        : base.questions
    const rounds =
      Array.isArray(saved.rounds) && saved.rounds.length === TOTAL_ROUNDS
        ? saved.rounds.map((r) => ({ ...emptyRound(), ...r }))
        : base.rounds
    const scores = { ...base.scores }
    for (const id of TEAM_IDS) {
      const v = saved.scores?.[id]
      if (typeof v === 'number' && Number.isFinite(v)) scores[id] = v
    }

    // A timer that was running when the page closed comes back paused at its last saved value.
    const t = saved.timer
    let timer = freshTimer(settings.timerSeconds)
    if (t && (t.status === 'running' || t.status === 'paused') && typeof t.remainingMs === 'number') {
      const remaining =
        t.status === 'running' && typeof t.endsAt === 'number'
          ? Math.max(0, t.endsAt - Date.now())
          : t.remainingMs
      timer =
        remaining > 0
          ? { ...timer, status: 'paused', remainingMs: Math.min(remaining, timer.durationMs) }
          : { ...timer, status: 'expired', remainingMs: 0 }
    } else if (t?.status === 'expired') {
      timer = { ...timer, status: 'expired', remainingMs: 0 }
    }

    const round = typeof saved.round === 'number' ? Math.min(TOTAL_ROUNDS, Math.max(1, saved.round)) : 1
    const history = Array.isArray(saved.history) ? saved.history : []

    return {
      ...base,
      phase: saved.phase ?? base.phase,
      round,
      teams,
      questions,
      tiebreakerQuestion: isQuestion(saved.tiebreakerQuestion)
        ? { ...base.tiebreakerQuestion, ...saved.tiebreakerQuestion }
        : base.tiebreakerQuestion,
      rounds,
      scores,
      history,
      nextEventId: Math.max(saved.nextEventId ?? 1, ...history.map((h) => h.id + 1), 1),
      timer,
      settings,
      finalized: !!saved.finalized,
      tiebreakerWinner: saved.tiebreakerWinner ?? null,
      tiebreakerReveal: !!saved.tiebreakerReveal,
    }
  } catch {
    return base
  }
}

let suspended = false

/** Wipes the save and stops further writes (so the unload flush can't resurrect it). */
export function clearSavedState(): void {
  suspended = true
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: nothing to clear.
  }
}

export function saveState(state: GameState): void {
  if (suspended) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked (private mode): the game keeps working in memory.
  }
}

export function hasSavedGame(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY)
  } catch {
    return false
  }
}
