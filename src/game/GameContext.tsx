import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { reducer, type Action } from './reducer'
import { sound, type SoundName } from './sound'
import { loadState, saveState } from './storage'
import type { GameState, Mark, Phase, Question, Settings, TeamId } from './types'

export interface GameActions {
  dispatch: (a: Action) => void
  sfx: (name: SoundName) => void
  startGame: () => void
  goLobby: () => void
  setPhase: (phase: Phase) => void
  setRep: (teamId: TeamId, name: string | null) => void
  randomPickReps: (rolls: Record<TeamId, number>) => void
  confirmReps: () => void
  skipReps: () => void
  enterArena: () => void
  timerStart: () => void
  timerPause: () => void
  timerToggle: () => void
  timerReset: () => void
  revealClue: () => void
  revealAnswer: () => void
  mark: (teamId: TeamId, mark: Mark) => void
  toggleSteal: () => void
  steal: (teamId: TeamId) => void
  undo: () => void
  adjust: (teamId: TeamId, delta: number, note?: string) => void
  nextRound: () => void
  prevRound: () => void
  finalize: () => void
  reopen: () => void
  startTiebreaker: () => void
  tiebreakerReveal: () => void
  tiebreakerWin: (teamId: TeamId) => void
  playAgain: () => void
  updateSettings: (s: Partial<Settings>) => void
  updateTeam: (teamId: TeamId, patch: { name?: string; members?: string[] }) => void
  updateQuestion: (index: number | 'tiebreaker', q: Question) => void
  resetQuestions: () => void
  resetTeams: () => void
}

const StateCtx = createContext<GameState | null>(null)
const ActionsCtx = createContext<GameActions | null>(null)

export function GameProvider({ children, initial }: { children: ReactNode; initial?: GameState }) {
  const [state, dispatch] = useReducer(reducer, initial, (init) => init ?? loadState())
  const stateRef = useRef(state)
  stateRef.current = state

  // Keep the sound engine in sync with settings.
  useEffect(() => {
    sound.configure(state.settings.soundEnabled, state.settings.volume)
  }, [state.settings.soundEnabled, state.settings.volume])

  // Unlock Web Audio on the first user gesture (autoplay policy).
  useEffect(() => {
    const unlock = () => sound.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Timer heartbeat. Remaining time is derived from an absolute end timestamp,
  // so throttled or late ticks never drift, and the interval only exists while running.
  const running = state.timer.status === 'running'
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => dispatch({ type: 'TIMER_TICK', now: Date.now() }), 100)
    return () => window.clearInterval(id)
  }, [running])

  // Persist (throttled, not debounced: timer ticks change state every 100ms and
  // must not postpone saving) and flush when the page is hidden or closed.
  const saveTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (saveTimer.current !== undefined) return
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = undefined
      saveState(stateRef.current)
    }, 250)
  }, [state])
  useEffect(() => {
    const flush = () => saveState(stateRef.current)
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = undefined
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }, [])

  const actions = useMemo<GameActions>(() => {
    const d = (a: Action) => dispatch(a)
    const sfx = (name: SoundName) => sound.play(name)
    return {
      dispatch: d,
      sfx,
      startGame: () => {
        sound.unlock()
        sfx('start')
        d({ type: 'START_GAME' })
      },
      goLobby: () => d({ type: 'GO_LOBBY' }),
      setPhase: (phase) => d({ type: 'SET_PHASE', phase }),
      setRep: (teamId, name) => d({ type: 'SET_REP', teamId, name }),
      randomPickReps: (rolls) => d({ type: 'RANDOM_PICK_REPS', rolls }),
      confirmReps: () => d({ type: 'CONFIRM_REPS' }),
      skipReps: () => d({ type: 'SKIP_REPS' }),
      enterArena: () => d({ type: 'ENTER_ARENA' }),
      timerStart: () => {
        sfx('click')
        d({ type: 'TIMER_START', now: Date.now() })
      },
      timerPause: () => d({ type: 'TIMER_PAUSE', now: Date.now() }),
      timerToggle: () => {
        const s = stateRef.current.timer.status
        if (s === 'running') d({ type: 'TIMER_PAUSE', now: Date.now() })
        else {
          sfx('click')
          d({ type: 'TIMER_START', now: Date.now() })
        }
      },
      timerReset: () => d({ type: 'TIMER_RESET' }),
      revealClue: () => {
        const s = stateRef.current
        if (!s.rounds[s.round - 1].clueRevealed) sfx('clue')
        d({ type: 'REVEAL_CLUE' })
      },
      revealAnswer: () => {
        const s = stateRef.current
        if (!s.rounds[s.round - 1].answerRevealed) sfx(s.round === 6 ? 'boss' : 'score')
        d({ type: 'REVEAL_ANSWER', now: Date.now() })
      },
      mark: (teamId, mark) => {
        const s = stateRef.current
        if (s.finalized || s.rounds[s.round - 1].marks[teamId]) return
        sfx(mark === 'correct' ? 'correct' : 'incorrect')
        d({ type: 'MARK', teamId, mark, now: Date.now() })
      },
      toggleSteal: () => {
        sfx('click')
        d({ type: 'TOGGLE_STEAL' })
      },
      steal: (teamId) => {
        sfx('steal')
        d({ type: 'STEAL', teamId, now: Date.now() })
      },
      undo: () => {
        if (stateRef.current.history.length) sfx('click')
        d({ type: 'UNDO' })
      },
      adjust: (teamId, delta, note) => {
        sfx('score')
        d({ type: 'ADJUST', teamId, delta, note, now: Date.now() })
      },
      nextRound: () => {
        sfx('click')
        d({ type: 'NEXT_ROUND' })
      },
      prevRound: () => d({ type: 'PREV_ROUND' }),
      finalize: () => d({ type: 'FINALIZE' }),
      reopen: () => d({ type: 'REOPEN' }),
      startTiebreaker: () => {
        sfx('boss')
        d({ type: 'START_TIEBREAKER' })
      },
      tiebreakerReveal: () => {
        sfx('score')
        d({ type: 'TIEBREAKER_REVEAL', now: Date.now() })
      },
      tiebreakerWin: (teamId) => d({ type: 'TIEBREAKER_WIN', teamId }),
      playAgain: () => d({ type: 'PLAY_AGAIN' }),
      updateSettings: (settings) => d({ type: 'UPDATE_SETTINGS', settings }),
      updateTeam: (teamId, patch) => d({ type: 'UPDATE_TEAM', teamId, ...patch }),
      updateQuestion: (index, question) => d({ type: 'UPDATE_QUESTION', index, question }),
      resetQuestions: () => d({ type: 'RESET_QUESTIONS' }),
      resetTeams: () => d({ type: 'RESET_TEAMS' }),
    }
  }, [])

  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useGame(): GameState {
  const s = useContext(StateCtx)
  if (!s) throw new Error('useGame must be used inside GameProvider')
  return s
}

export function useActions(): GameActions {
  const a = useContext(ActionsCtx)
  if (!a) throw new Error('useActions must be used inside GameProvider')
  return a
}
