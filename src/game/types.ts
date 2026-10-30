export type TeamId = 'g1' | 'g3' | 'g4' | 'g5' | 'g6'

export const TEAM_IDS: TeamId[] = ['g1', 'g3', 'g4', 'g5', 'g6']
export const TOTAL_ROUNDS = 6

export interface Team {
  id: TeamId
  name: string
  /** Member names used by the representative random pick. */
  members: string[]
  color: string
}

export type OptionIndex = 0 | 1 | 2 | 3

export interface Question {
  id: string
  topic: string
  text: string
  options: [string, string, string, string]
  correct: OptionIndex
  clue: string
  explanation: string
}

export type Mark = 'correct' | 'incorrect'

export interface RoundState {
  clueRevealed: boolean
  answerRevealed: boolean
  /** Per-team result for this round. Missing = not yet judged. */
  marks: Partial<Record<TeamId, Mark>>
  stealEnabled: boolean
  steals: Partial<Record<TeamId, boolean>>
  /** Representative name per team; null = skipped/unknown. */
  reps: Partial<Record<TeamId, string | null>>
  repsConfirmed: boolean
}

export type ScoreKind = 'correct' | 'incorrect' | 'steal' | 'manual'

export interface ScoreEvent {
  id: number
  teamId: TeamId
  delta: number
  /** 1-based round, or 0 for manual corrections outside a round / tiebreaker. */
  round: number
  kind: ScoreKind
  note: string
  at: number
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'expired'

export interface TimerState {
  status: TimerStatus
  durationMs: number
  remainingMs: number
  /** Epoch ms when a running timer hits zero. Only meaningful while running. */
  endsAt: number | null
}

export type Phase =
  | 'lobby'
  | 'reps'
  | 'roundIntro'
  | 'arena'
  | 'finalize'
  | 'winner'
  | 'tiebreaker'

export interface Settings {
  soundEnabled: boolean
  volume: number
  timerSeconds: number
  allowSteals: boolean
  stealPoints: number
  finalDoublePoints: boolean
  /** 'auto' follows OS prefers-reduced-motion. */
  motion: 'auto' | 'full' | 'reduced'
  skipIntro: boolean
}

export interface GameState {
  version: number
  phase: Phase
  round: number
  teams: Team[]
  questions: Question[]
  tiebreakerQuestion: Question
  rounds: RoundState[]
  scores: Record<TeamId, number>
  history: ScoreEvent[]
  nextEventId: number
  timer: TimerState
  settings: Settings
  /** Scores are locked once the host finalizes after round 6. */
  finalized: boolean
  tiebreakerWinner: TeamId | null
  tiebreakerReveal: boolean
}
