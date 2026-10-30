import type { GameState, Question, RoundState, Team, TeamId } from './types'
import { TOTAL_ROUNDS } from './types'

export const BASE_POINTS = 2
export const CLUE_POINTS = 1

export function isFinalRound(round: number): boolean {
  return round === TOTAL_ROUNDS
}

export function roundMultiplier(state: GameState, round = state.round): number {
  return isFinalRound(round) && state.settings.finalDoublePoints ? 2 : 1
}

/** Points a correct answer is worth right now for the given round. */
export function pointValue(state: GameState, round = state.round): number {
  const r = state.rounds[round - 1]
  const base = r?.clueRevealed ? CLUE_POINTS : BASE_POINTS
  return base * roundMultiplier(state, round)
}

export function currentRound(state: GameState): RoundState {
  return state.rounds[state.round - 1]
}

export function currentQuestion(state: GameState): Question {
  return state.questions[state.round - 1]
}

export function teamById(state: GameState, id: TeamId): Team {
  const team = state.teams.find((t) => t.id === id)
  if (!team) throw new Error(`Unknown team ${id}`)
  return team
}

export interface RankedTeam {
  team: Team
  score: number
  /** Competition ranking: ties share a rank, the next rank is skipped (1,1,3). */
  rank: number
}

export function rankTeams(teams: Team[], scores: Record<TeamId, number>): RankedTeam[] {
  const sorted = [...teams].sort((a, b) => scores[b.id] - scores[a.id])
  return sorted.map((team) => ({
    team,
    score: scores[team.id],
    rank: 1 + sorted.filter((t) => scores[t.id] > scores[team.id]).length,
  }))
}

export function leaders(state: GameState): TeamId[] {
  const top = Math.max(...state.teams.map((t) => state.scores[t.id]))
  return state.teams.filter((t) => state.scores[t.id] === top).map((t) => t.id)
}

/** The winning team, or null while the top spot is tied and no tiebreaker has settled it. */
export function winner(state: GameState): TeamId | null {
  const top = leaders(state)
  if (top.length === 1) return top[0]
  if (state.tiebreakerWinner && top.includes(state.tiebreakerWinner)) return state.tiebreakerWinner
  return null
}

/**
 * Representative rotation, derived from confirmed rounds before `beforeRound`.
 * Returns member indexes already used in the current cycle. When every member
 * has had a turn the cycle resets.
 */
export function usedMembers(state: GameState, teamId: TeamId, beforeRound = state.round): number[] {
  const members = teamById(state, teamId).members
  let used: number[] = []
  for (let i = 0; i < beforeRound - 1; i++) {
    const r = state.rounds[i]
    if (!r?.repsConfirmed) continue
    const idx = members.indexOf(r.reps[teamId] ?? '')
    if (idx < 0) continue
    if (used.length >= members.length) used = []
    if (!used.includes(idx)) used.push(idx)
  }
  if (used.length >= members.length) used = []
  return used
}

/** Picks a member who has not played this cycle. `roll` is a random number in [0, 1). */
export function randomRep(state: GameState, teamId: TeamId, roll: number, round = state.round): string | null {
  const members = teamById(state, teamId).members
  if (members.length === 0) return null
  const used = usedMembers(state, teamId, round)
  const pool = members.filter((_, i) => !used.includes(i))
  return pool[Math.min(Math.floor(roll * pool.length), pool.length - 1)]
}

/** True if this name already represented the team earlier in the current rotation cycle. */
export function isRepeat(state: GameState, teamId: TeamId, name: string | null | undefined): boolean {
  if (!name) return false
  const idx = teamById(state, teamId).members.indexOf(name)
  return idx >= 0 && usedMembers(state, teamId).includes(idx)
}

export function formatRound(round: number): string {
  return `${String(round).padStart(2, '0')}/${String(TOTAL_ROUNDS).padStart(2, '0')}`
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const
