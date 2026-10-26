import {
  defaultQuestions,
  defaultSettings,
  defaultTeams,
  defaultTiebreaker,
  emptyRounds,
  zeroScores,
} from './defaults'
import { currentRound, pointValue, suggestRep, teamById } from './logic'
import type {
  GameState,
  Mark,
  Phase,
  Question,
  RoundState,
  ScoreEvent,
  Settings,
  TeamId,
  TimerState,
} from './types'
import { TEAM_IDS, TOTAL_ROUNDS } from './types'

export const STATE_VERSION = 1

export type Action =
  | { type: 'START_GAME' }
  | { type: 'GO_LOBBY' }
  | { type: 'SET_PHASE'; phase: Phase }
  | { type: 'SET_REP'; teamId: TeamId; name: string | null }
  | { type: 'AUTO_PICK_REPS' }
  | { type: 'CONFIRM_REPS' }
  | { type: 'SKIP_REPS' }
  | { type: 'ENTER_ARENA' }
  | { type: 'TIMER_START'; now: number }
  | { type: 'TIMER_PAUSE'; now: number }
  | { type: 'TIMER_RESET' }
  | { type: 'TIMER_TICK'; now: number }
  | { type: 'REVEAL_CLUE' }
  | { type: 'REVEAL_ANSWER'; now: number }
  | { type: 'MARK'; teamId: TeamId; mark: Mark; now: number }
  | { type: 'TOGGLE_STEAL' }
  | { type: 'STEAL'; teamId: TeamId; now: number }
  | { type: 'UNDO' }
  | { type: 'ADJUST'; teamId: TeamId; delta: number; note?: string; now: number }
  | { type: 'NEXT_ROUND' }
  | { type: 'PREV_ROUND' }
  | { type: 'FINALIZE' }
  | { type: 'REOPEN' }
  | { type: 'START_TIEBREAKER' }
  | { type: 'TIEBREAKER_REVEAL'; now: number }
  | { type: 'TIEBREAKER_WIN'; teamId: TeamId }
  | { type: 'PLAY_AGAIN' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'UPDATE_TEAM'; teamId: TeamId; name?: string; members?: string[] }
  | { type: 'UPDATE_QUESTION'; index: number | 'tiebreaker'; question: Question }
  | { type: 'RESET_QUESTIONS' }
  | { type: 'RESET_TEAMS' }
  | { type: 'RESTORE'; state: GameState }

export function freshTimer(seconds: number): TimerState {
  const ms = Math.max(1, Math.round(seconds)) * 1000
  return { status: 'idle', durationMs: ms, remainingMs: ms, endsAt: null }
}

export function initialState(): GameState {
  const settings = defaultSettings()
  return {
    version: STATE_VERSION,
    phase: 'lobby',
    round: 1,
    teams: defaultTeams(),
    questions: defaultQuestions(),
    tiebreakerQuestion: defaultTiebreaker(),
    rounds: emptyRounds(),
    scores: zeroScores(),
    history: [],
    nextEventId: 1,
    timer: freshTimer(settings.timerSeconds),
    settings,
    finalized: false,
    tiebreakerWinner: null,
    tiebreakerReveal: false,
  }
}

/** Clears everything about a played game while keeping teams, questions and settings. */
function resetProgress(state: GameState): GameState {
  return {
    ...state,
    round: 1,
    rounds: emptyRounds(),
    scores: zeroScores(),
    history: [],
    timer: freshTimer(state.settings.timerSeconds),
    finalized: false,
    tiebreakerWinner: null,
    tiebreakerReveal: false,
  }
}

function updateRound(state: GameState, patch: (r: RoundState) => RoundState, round = state.round): GameState {
  const rounds = state.rounds.map((r, i) => (i === round - 1 ? patch(r) : r))
  return { ...state, rounds }
}

function pauseTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== 'running' || timer.endsAt === null) return timer
  return { ...timer, status: 'paused', remainingMs: Math.max(0, timer.endsAt - now), endsAt: null }
}

function pushEvent(
  state: GameState,
  event: Omit<ScoreEvent, 'id'>,
): GameState {
  return {
    ...state,
    scores: { ...state.scores, [event.teamId]: state.scores[event.teamId] + event.delta },
    history: [...state.history, { ...event, id: state.nextEventId }],
    nextEventId: state.nextEventId + 1,
  }
}

/** Score changes are frozen once the winner has been declared. */
function scoringLocked(state: GameState): boolean {
  return state.finalized
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME':
      return { ...resetProgress(state), phase: 'reps' }

    case 'GO_LOBBY':
      return { ...state, phase: 'lobby', timer: freshTimer(state.settings.timerSeconds) }

    case 'SET_PHASE':
      return { ...state, phase: action.phase }

    case 'SET_REP':
      return updateRound(state, (r) => ({ ...r, reps: { ...r.reps, [action.teamId]: action.name } }))

    case 'AUTO_PICK_REPS':
      return updateRound(state, (r) => {
        const reps = { ...r.reps }
        for (const id of TEAM_IDS) if (!reps[id]) reps[id] = suggestRep(state, id)
        return { ...r, reps }
      })

    case 'CONFIRM_REPS':
      return {
        ...updateRound(state, (r) => ({ ...r, repsConfirmed: true })),
        phase: 'roundIntro',
      }

    case 'SKIP_REPS':
      return {
        ...updateRound(state, (r) => ({ ...r, reps: {}, repsConfirmed: false })),
        phase: 'roundIntro',
      }

    case 'ENTER_ARENA':
      return { ...state, phase: 'arena', timer: freshTimer(state.settings.timerSeconds) }

    case 'TIMER_START': {
      const t = state.timer
      if (t.status === 'running') return state
      const remaining = t.status === 'expired' || t.remainingMs <= 0 ? t.durationMs : t.remainingMs
      return {
        ...state,
        timer: { ...t, status: 'running', remainingMs: remaining, endsAt: action.now + remaining },
      }
    }

    case 'TIMER_PAUSE':
      return { ...state, timer: pauseTimer(state.timer, action.now) }

    case 'TIMER_RESET':
      return { ...state, timer: freshTimer(state.settings.timerSeconds) }

    case 'TIMER_TICK': {
      const t = state.timer
      if (t.status !== 'running' || t.endsAt === null) return state
      const remaining = Math.max(0, t.endsAt - action.now)
      if (remaining === 0) {
        return { ...state, timer: { ...t, status: 'expired', remainingMs: 0, endsAt: null } }
      }
      if (remaining === t.remainingMs) return state
      return { ...state, timer: { ...t, remainingMs: remaining } }
    }

    case 'REVEAL_CLUE':
      if (currentRound(state).clueRevealed) return state
      return updateRound(state, (r) => ({ ...r, clueRevealed: true }))

    case 'REVEAL_ANSWER':
      if (currentRound(state).answerRevealed) return state
      return {
        ...updateRound(state, (r) => ({ ...r, answerRevealed: true })),
        timer: pauseTimer(state.timer, action.now),
      }

    case 'MARK': {
      if (scoringLocked(state)) return state
      const r = currentRound(state)
      // Duplicate protection: a team can be judged only once per question.
      // Use UNDO or a manual correction to change a judgement.
      if (r.marks[action.teamId]) return state
      const delta = action.mark === 'correct' ? pointValue(state) : 0
      const withMark = updateRound(state, (rs) => ({
        ...rs,
        marks: { ...rs.marks, [action.teamId]: action.mark },
      }))
      const team = teamById(state, action.teamId)
      return pushEvent(withMark, {
        teamId: action.teamId,
        delta,
        round: state.round,
        kind: action.mark,
        note:
          action.mark === 'correct'
            ? `${team.name} correct${r.clueRevealed ? ' (clue used)' : ''}`
            : `${team.name} incorrect`,
        at: action.now,
      })
    }

    case 'TOGGLE_STEAL':
      if (!state.settings.allowSteals) return state
      return updateRound(state, (r) => ({ ...r, stealEnabled: !r.stealEnabled }))

    case 'STEAL': {
      if (scoringLocked(state)) return state
      const r = currentRound(state)
      if (!state.settings.allowSteals || !r.stealEnabled) return state
      if (r.steals[action.teamId] || r.marks[action.teamId] === 'correct') return state
      const withSteal = updateRound(state, (rs) => ({
        ...rs,
        steals: { ...rs.steals, [action.teamId]: true },
      }))
      return pushEvent(withSteal, {
        teamId: action.teamId,
        delta: state.settings.stealPoints,
        round: state.round,
        kind: 'steal',
        note: `${teamById(state, action.teamId).name} stole`,
        at: action.now,
      })
    }

    case 'UNDO': {
      if (scoringLocked(state)) return state
      const last = state.history[state.history.length - 1]
      if (!last) return state
      let next: GameState = {
        ...state,
        scores: { ...state.scores, [last.teamId]: state.scores[last.teamId] - last.delta },
        history: state.history.slice(0, -1),
      }
      if (last.kind === 'correct' || last.kind === 'incorrect') {
        next = updateRound(
          next,
          (r) => {
            const marks = { ...r.marks }
            delete marks[last.teamId]
            return { ...r, marks }
          },
          last.round,
        )
      } else if (last.kind === 'steal') {
        next = updateRound(
          next,
          (r) => {
            const steals = { ...r.steals }
            delete steals[last.teamId]
            return { ...r, steals }
          },
          last.round,
        )
      }
      return next
    }

    case 'ADJUST': {
      if (scoringLocked(state) || action.delta === 0 || !Number.isFinite(action.delta)) return state
      const team = teamById(state, action.teamId)
      const sign = action.delta > 0 ? '+' : ''
      return pushEvent(state, {
        teamId: action.teamId,
        delta: action.delta,
        round: state.phase === 'lobby' ? 0 : state.round,
        kind: 'manual',
        note: action.note || `Manual correction ${sign}${action.delta} for ${team.name}`,
        at: action.now,
      })
    }

    case 'NEXT_ROUND': {
      const timer = freshTimer(state.settings.timerSeconds)
      if (state.round >= TOTAL_ROUNDS) return { ...state, phase: 'finalize', timer }
      return { ...state, round: state.round + 1, phase: 'reps', timer }
    }

    case 'PREV_ROUND': {
      if (state.round <= 1) return state
      return {
        ...state,
        round: state.round - 1,
        phase: 'arena',
        timer: freshTimer(state.settings.timerSeconds),
      }
    }

    case 'FINALIZE':
      return { ...state, finalized: true, phase: 'winner', timer: freshTimer(state.settings.timerSeconds) }

    case 'REOPEN':
      return {
        ...state,
        finalized: false,
        tiebreakerWinner: null,
        tiebreakerReveal: false,
        phase: 'arena',
        round: TOTAL_ROUNDS,
      }

    case 'START_TIEBREAKER':
      return {
        ...state,
        phase: 'tiebreaker',
        tiebreakerReveal: false,
        timer: freshTimer(state.settings.timerSeconds),
      }

    case 'TIEBREAKER_REVEAL':
      return { ...state, tiebreakerReveal: true, timer: pauseTimer(state.timer, action.now) }

    case 'TIEBREAKER_WIN':
      return { ...state, tiebreakerWinner: action.teamId, phase: 'winner' }

    case 'PLAY_AGAIN':
      return { ...resetProgress(state), phase: 'lobby' }

    case 'UPDATE_SETTINGS': {
      const settings = { ...state.settings, ...action.settings }
      settings.timerSeconds = clamp(Math.round(settings.timerSeconds) || 10, 3, 120)
      settings.volume = clamp(settings.volume, 0, 1)
      settings.stealPoints = clamp(Math.round(settings.stealPoints) || 1, 1, 5)
      const timer =
        state.timer.status === 'idle' ? freshTimer(settings.timerSeconds) : state.timer
      // Turning steals off mid-round closes any open steal window.
      const rounds = settings.allowSteals
        ? state.rounds
        : state.rounds.map((r) => (r.stealEnabled ? { ...r, stealEnabled: false } : r))
      return { ...state, settings, timer, rounds }
    }

    case 'UPDATE_TEAM':
      return {
        ...state,
        teams: state.teams.map((t) =>
          t.id === action.teamId
            ? {
                ...t,
                name: action.name !== undefined ? action.name : t.name,
                members: action.members !== undefined ? action.members : t.members,
              }
            : t,
        ),
      }

    case 'UPDATE_QUESTION':
      if (action.index === 'tiebreaker') return { ...state, tiebreakerQuestion: action.question }
      return {
        ...state,
        questions: state.questions.map((q, i) => (i === action.index ? action.question : q)),
      }

    case 'RESET_QUESTIONS':
      return { ...state, questions: defaultQuestions(), tiebreakerQuestion: defaultTiebreaker() }

    case 'RESET_TEAMS':
      return { ...state, teams: defaultTeams() }

    case 'RESTORE':
      return action.state
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
