/** All the meme copy lives here so it is easy to tone up or down. */

export const TIMES_UP = [
  "TIME'S UP. THE BRAINCELLS HAVE LEFT THE SERVER.",
  'TIME\'S UP. BUFFERING… FOREVER.',
  "TIME'S UP. NPC MODE ACTIVATED.",
]

export const CLUE_REACTIONS = [
  'THE HOST HAS DROPPED THE LORE.',
  'LORE DROP INCOMING.',
  'SIDE QUEST HINT UNLOCKED.',
]

export const CORRECT_REACTIONS = [
  'BRO ACTUALLY STUDIED 💀',
  'ETHICS KNOWLEDGE UNLOCKED',
  'ACADEMIC INTEGRITY +100',
  'AURA FARMING SUCCESSFUL',
  'LOCKED IN. FR.',
]

export const INCORRECT_REACTIONS = [
  'THE COOKING IS QUESTIONABLE',
  'ZERO AURA DETECTED',
  'RESPECTFULLY… NO.',
  'THAT WAS NOT IT, CHIEF',
]

export const REVEAL_REACTIONS = [
  'ANSWER DEPLOYED.',
  'THE TRUTH HAS BEEN RENDERED.',
  'LOADING ENLIGHTENMENT… 100%',
]

export const STEAL_REACTIONS = ['ITEM STOLEN. NO CAP.', 'STEAL SUCCESSFUL. THE AUDACITY.']

export const WINNER_MESSAGES = [
  'CERTIFIED ETHICS SIGMA',
  'MAXIMUM AURA ACHIEVED',
  'THE PLAGIARISM POLICE SALUTE YOU',
]

export const FLOATERS = [
  '+AURA',
  'NO CAP',
  'FR FR',
  'LOCKED IN',
  '404 ETHICS',
  'CITE YOUR SOURCES',
  'NPC',
  'GG',
  '©?',
  'LORE',
  'W',
  'L',
  'SIGMA',
  'RIZZ.EXE',
]

export function pick<T>(list: readonly T[], seed: number): T {
  return list[Math.abs(Math.floor(seed)) % list.length]
}
