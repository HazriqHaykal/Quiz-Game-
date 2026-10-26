import { beforeEach, describe, expect, it } from 'vitest'
import { pointValue, rankTeams, suggestRep, usedMembers, winner } from './logic'
import { initialState, reducer, type Action } from './reducer'
import { STORAGE_KEY, loadState, saveState } from './storage'
import type { GameState } from './types'
import { TEAM_IDS } from './types'

const run = (s: GameState, ...actions: Action[]) => actions.reduce(reducer, s)
const NOW = 1_000_000

let s: GameState
beforeEach(() => {
  s = run(initialState(), { type: 'START_GAME' })
})

describe('scoring', () => {
  it('awards +2 without clue and +1 after the clue', () => {
    s = run(s, { type: 'MARK', teamId: 'g1', mark: 'correct', now: NOW })
    expect(s.scores.g1).toBe(2)
    s = run(s, { type: 'REVEAL_CLUE' })
    expect(pointValue(s)).toBe(1)
    s = run(s, { type: 'MARK', teamId: 'g3', mark: 'correct', now: NOW })
    expect(s.scores.g3).toBe(1)
    s = run(s, { type: 'MARK', teamId: 'g4', mark: 'incorrect', now: NOW })
    expect(s.scores.g4).toBe(0)
  })

  it('revealing the clue twice changes nothing and deducts nothing', () => {
    s = run(s, { type: 'MARK', teamId: 'g1', mark: 'correct', now: NOW })
    const once = run(s, { type: 'REVEAL_CLUE' })
    const twice = run(once, { type: 'REVEAL_CLUE' })
    expect(twice).toBe(once)
    expect(once.scores.g1).toBe(2)
  })

  it('blocks duplicate judging of the same team on the same question', () => {
    s = run(
      s,
      { type: 'MARK', teamId: 'g1', mark: 'correct', now: NOW },
      { type: 'MARK', teamId: 'g1', mark: 'correct', now: NOW },
      { type: 'MARK', teamId: 'g1', mark: 'incorrect', now: NOW },
    )
    expect(s.scores.g1).toBe(2)
    expect(s.history).toHaveLength(1)
  })

  it('undo restores scores and lets the team be judged again', () => {
    s = run(s, { type: 'MARK', teamId: 'g5', mark: 'correct', now: NOW }, { type: 'UNDO' })
    expect(s.scores.g5).toBe(0)
    expect(s.rounds[0].marks.g5).toBeUndefined()
    s = run(s, { type: 'REVEAL_CLUE' }, { type: 'MARK', teamId: 'g5', mark: 'correct', now: NOW })
    expect(s.scores.g5).toBe(1)
  })

  it('steals only work when the window is open, once per team, and are undoable', () => {
    s = run(s, { type: 'STEAL', teamId: 'g6', now: NOW })
    expect(s.scores.g6).toBe(0)
    s = run(
      s,
      { type: 'TOGGLE_STEAL' },
      { type: 'STEAL', teamId: 'g6', now: NOW },
      { type: 'STEAL', teamId: 'g6', now: NOW },
    )
    expect(s.scores.g6).toBe(1)
    s = run(s, { type: 'MARK', teamId: 'g1', mark: 'correct', now: NOW }, { type: 'STEAL', teamId: 'g1', now: NOW })
    expect(s.scores.g1).toBe(2)
    s = run(s, { type: 'UNDO' }, { type: 'UNDO' })
    expect(s.scores.g6).toBe(0)
    expect(s.rounds[0].steals.g6).toBeUndefined()
  })

  it('manual corrections apply and undo exactly', () => {
    s = run(
      s,
      { type: 'ADJUST', teamId: 'g3', delta: 5, now: NOW },
      { type: 'ADJUST', teamId: 'g3', delta: -2, now: NOW },
    )
    expect(s.scores.g3).toBe(3)
    s = run(s, { type: 'UNDO' })
    expect(s.scores.g3).toBe(5)
  })

  it('final round double points only when enabled', () => {
    for (let i = 0; i < 5; i++) s = run(s, { type: 'NEXT_ROUND' })
    expect(s.round).toBe(6)
    expect(pointValue(s)).toBe(2)
    s = run(s, { type: 'UPDATE_SETTINGS', settings: { finalDoublePoints: true } })
    expect(pointValue(s)).toBe(4)
    s = run(s, { type: 'REVEAL_CLUE' })
    expect(pointValue(s)).toBe(2)
  })

  it('scores persist when moving between rounds', () => {
    s = run(s, { type: 'MARK', teamId: 'g3', mark: 'correct', now: NOW }, { type: 'NEXT_ROUND' }, { type: 'PREV_ROUND' })
    expect(s.scores.g3).toBe(2)
    expect(s.rounds[0].marks.g3).toBe('correct')
  })
})

describe('timer', () => {
  it('runs, pauses, resumes and expires using absolute timestamps', () => {
    s = run(s, { type: 'ENTER_ARENA' }, { type: 'TIMER_START', now: NOW })
    s = run(s, { type: 'TIMER_TICK', now: NOW + 4000 })
    expect(s.timer.remainingMs).toBe(6000)
    s = run(s, { type: 'TIMER_PAUSE', now: NOW + 4000 })
    // Time passing while paused must not count.
    s = run(s, { type: 'TIMER_TICK', now: NOW + 60000 })
    expect(s.timer.status).toBe('paused')
    expect(s.timer.remainingMs).toBe(6000)
    s = run(s, { type: 'TIMER_START', now: NOW + 60000 }, { type: 'TIMER_TICK', now: NOW + 66000 })
    expect(s.timer.status).toBe('expired')
    expect(s.timer.remainingMs).toBe(0)
  })

  it('stops when the round changes and when resetting', () => {
    s = run(s, { type: 'ENTER_ARENA' }, { type: 'TIMER_START', now: NOW }, { type: 'NEXT_ROUND' })
    expect(s.timer.status).toBe('idle')
    expect(s.timer.remainingMs).toBe(10000)
    s = run(s, { type: 'TIMER_START', now: NOW }, { type: 'PREV_ROUND' })
    expect(s.timer.status).toBe('idle')
    s = run(s, { type: 'TIMER_START', now: NOW }, { type: 'TIMER_RESET' })
    expect(s.timer.status).toBe('idle')
  })

  it('revealing the answer pauses the timer', () => {
    s = run(s, { type: 'ENTER_ARENA' }, { type: 'TIMER_START', now: NOW }, { type: 'REVEAL_ANSWER', now: NOW + 3000 })
    expect(s.timer.status).toBe('paused')
    expect(s.timer.remainingMs).toBe(7000)
  })
})

describe('representative rotation', () => {
  it('suggests unused members and resets the cycle when everyone has played', () => {
    for (let r = 1; r <= 6; r++) {
      const expected = s.teams[0].members[(r - 1) % 5]
      expect(suggestRep(s, 'g1')).toBe(expected)
      s = run(s, { type: 'AUTO_PICK_REPS' }, { type: 'CONFIRM_REPS' })
      expect(s.rounds[r - 1].reps.g1).toBe(expected)
      if (r < 6) s = run(s, { type: 'NEXT_ROUND' })
    }
    // Round 6 starts a new cycle with Member 1 again.
    expect(usedMembers(s, 'g1', 6)).toEqual([])
  })

  it('skipping names does not consume rotation turns', () => {
    s = run(s, { type: 'SKIP_REPS' }, { type: 'NEXT_ROUND' })
    expect(suggestRep(s, 'g1')).toBe('Member 1')
  })
})

describe('full six-round game', () => {
  it('plays to a winner and locks scores', () => {
    for (let r = 1; r <= 6; r++) {
      s = run(s, { type: 'SKIP_REPS' }, { type: 'ENTER_ARENA' }, { type: 'TIMER_START', now: NOW })
      if (r % 2 === 0) s = run(s, { type: 'REVEAL_CLUE' })
      s = run(s, { type: 'MARK', teamId: 'g4', mark: 'correct', now: NOW })
      s = run(s, { type: 'MARK', teamId: 'g1', mark: r === 6 ? 'correct' : 'incorrect', now: NOW })
      s = run(s, { type: 'REVEAL_ANSWER', now: NOW }, { type: 'NEXT_ROUND' })
    }
    expect(s.phase).toBe('finalize')
    // g4: 2+1+2+1+2+1 = 9, g1: round 6 with clue = 1
    expect(s.scores.g4).toBe(9)
    expect(s.scores.g1).toBe(1)
    s = run(s, { type: 'FINALIZE' })
    expect(s.phase).toBe('winner')
    expect(winner(s)).toBe('g4')
    expect(run(s, { type: 'ADJUST', teamId: 'g1', delta: 10, now: NOW }).scores.g1).toBe(1)
    expect(run(s, { type: 'UNDO' })).toBe(s)
    expect(rankTeams(s.teams, s.scores)[0].team.id).toBe('g4')
  })

  it('detects a tie and resolves it with sudden death', () => {
    s = run(
      s,
      { type: 'ADJUST', teamId: 'g3', delta: 4, now: NOW },
      { type: 'ADJUST', teamId: 'g5', delta: 4, now: NOW },
      { type: 'FINALIZE' },
    )
    expect(winner(s)).toBeNull()
    expect(rankTeams(s.teams, s.scores).filter((r) => r.rank === 1)).toHaveLength(2)
    s = run(s, { type: 'START_TIEBREAKER' }, { type: 'TIEBREAKER_WIN', teamId: 'g5' })
    expect(winner(s)).toBe('g5')
    expect(s.phase).toBe('winner')
  })

  it('play again wipes progress but keeps edited questions and teams', () => {
    s = run(
      s,
      { type: 'UPDATE_TEAM', teamId: 'g1', name: 'The Citers' },
      { type: 'UPDATE_QUESTION', index: 2, question: { ...s.questions[2], text: 'Custom' } },
      { type: 'MARK', teamId: 'g1', mark: 'correct', now: NOW },
      { type: 'PLAY_AGAIN' },
    )
    expect(s.phase).toBe('lobby')
    expect(s.scores.g1).toBe(0)
    expect(s.history).toHaveLength(0)
    expect(s.teams[0].name).toBe('The Citers')
    expect(s.questions[2].text).toBe('Custom')
  })
})

describe('persistence', () => {
  it('round-trips through localStorage with a running timer coming back paused', () => {
    s = run(
      s,
      { type: 'CONFIRM_REPS' },
      { type: 'ENTER_ARENA' },
      { type: 'MARK', teamId: 'g6', mark: 'correct', now: NOW },
      { type: 'UPDATE_QUESTION', index: 0, question: { ...s.questions[0], text: 'Edited?' } },
      { type: 'TIMER_START', now: Date.now() },
    )
    saveState(s)
    const loaded = loadState()
    expect(loaded.scores.g6).toBe(2)
    expect(loaded.questions[0].text).toBe('Edited?')
    expect(loaded.phase).toBe('arena')
    expect(loaded.timer.status).toBe('paused')
    expect(loaded.history).toHaveLength(1)
    expect(run(loaded, { type: 'UNDO' }).scores.g6).toBe(0)
  })

  it('falls back to defaults on corrupted data', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadState().phase).toBe('lobby')
  })

  it('has every competing team', () => {
    expect(Object.keys(initialState().scores).sort()).toEqual([...TEAM_IDS].sort())
    expect(initialState().teams.map((t) => t.name)).toEqual(['Group 1', 'Group 3', 'Group 4', 'Group 5', 'Group 6'])
  })
})
