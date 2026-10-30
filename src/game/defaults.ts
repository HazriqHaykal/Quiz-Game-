import type { Question, RoundState, Settings, Team, TeamId } from './types'
import { TEAM_IDS, TOTAL_ROUNDS } from './types'

const TEAM_COLORS: Record<TeamId, string> = {
  g1: '#c6ff00',
  g3: '#ff2bd6',
  g4: '#9d4dff',
  g5: '#00f0ff',
  g6: '#ff8a00',
}

const TEAM_NUMBERS: Record<TeamId, number> = { g1: 1, g3: 3, g4: 4, g5: 5, g6: 6 }

const TEAM_MEMBERS: Record<TeamId, string[]> = {
  g1: ['Najihah', 'Sarah', 'Erisya', 'Nisa', 'Balqis', 'Nabira'],
  g3: ['Ammar', 'Zuhairi', 'Irsyad', 'Iman', 'Hafizuddin', 'Amirul', 'Arif'],
  g4: ['Haizad', 'Adam', 'Hafiy', 'Fathul', 'Zhafir', 'Luqman'],
  g5: ['Alex', 'Li Jia Qi', 'Daniel', 'Mei', 'Ravi', 'Syafiq'],
  g6: ["A'in", 'Aina Elyani', 'Fatimah', 'Aina Sakinah', 'Sabrina', 'Yasmin'],
}

export function defaultTeams(): Team[] {
  return TEAM_IDS.map((id) => ({
    id,
    name: `Group ${TEAM_NUMBERS[id]}`,
    members: [...TEAM_MEMBERS[id]],
    color: TEAM_COLORS[id],
  }))
}

/**
 * Sample questions on plagiarism and intellectual property.
 * These are editable placeholders, not a reproduction of any lecturer's slides.
 */
export function defaultQuestions(): Question[] {
  return [
    {
      id: 'q1',
      topic: 'Plagiarism',
      text: "A student submits another person's assignment as their own. What is the main ethical violation?",
      options: ['Trademark infringement', 'Plagiarism', 'Fair use', 'Trade secret protection'],
      correct: 1,
      clue: "It involves taking credit for someone else's work.",
      explanation: "Presenting another person's work as your own is plagiarism.",
    },
    {
      id: 'q2',
      topic: 'Citation',
      text: 'A student changes a few words from an online article but does not acknowledge the source. Is this acceptable?',
      options: [
        'Yes, because some words changed',
        'Yes, if the article is online',
        'No, it may still be plagiarism',
        'Yes, if the assignment is short',
      ],
      correct: 2,
      clue: 'Changing the wording does not remove the need to acknowledge borrowed ideas.',
      explanation: 'Paraphrased ideas still need appropriate attribution.',
    },
    {
      id: 'q3',
      topic: 'Trademarks',
      text: "Which type of intellectual property helps distinguish a company's goods or services from others?",
      options: ['Trademark', 'Patent', 'Trade secret', 'Citation'],
      correct: 0,
      clue: "Think about a company's brand name or logo.",
      explanation: 'Trademarks identify and distinguish goods or services.',
    },
    {
      id: 'q4',
      topic: 'Copyright',
      text: 'What does copyright generally protect?',
      options: [
        'Original creative expression',
        'Every general idea',
        'Every company name',
        'All facts and information',
      ],
      correct: 0,
      clue: 'Think about books, music, artwork, and other creative works.',
      explanation:
        'Copyright generally protects original expression rather than abstract ideas or facts alone.',
    },
    {
      id: 'q5',
      topic: 'Software Piracy',
      text: 'A person installs an unauthorized copy of commercial software in violation of its licence. What issue does this raise?',
      options: ['Proper citation', 'Software piracy', 'Trademark registration', 'Academic referencing'],
      correct: 1,
      clue: 'Think about using software without the required authorization.',
      explanation: 'Unauthorized copying or use of software can violate its licence and applicable law.',
    },
    {
      id: 'q6',
      topic: 'Fair Use',
      text: 'Does educational use automatically make copying an entire copyrighted book permissible?',
      options: [
        'Yes, educational use always permits it',
        'Yes, if the book is old',
        'No, the applicable law and circumstances matter',
        'Yes, if no money is charged',
      ],
      correct: 2,
      clue: 'Consider purpose, amount copied, market effect, and the relevant legal rules.',
      explanation:
        'Educational purpose alone does not automatically make copying an entire book permissible.',
    },
  ]
}

export function defaultTiebreaker(): Question {
  return {
    id: 'tb',
    topic: 'Sudden Death',
    text: 'Which practice best protects you from accidental plagiarism when writing an assignment?',
    options: [
      'Copying sources first and citing later if you remember',
      'Recording sources and citing them as you write',
      'Only citing sources that are printed books',
      'Changing every fifth word of the source text',
    ],
    correct: 1,
    clue: 'Good habits start while you are still taking notes.',
    explanation: 'Tracking and citing sources as you write prevents missing or forgotten attributions.',
  }
}

export function defaultSettings(): Settings {
  return {
    soundEnabled: true,
    volume: 0.6,
    timerSeconds: 10,
    allowSteals: true,
    stealPoints: 1,
    finalDoublePoints: false,
    motion: 'auto',
    skipIntro: false,
  }
}

export function emptyRound(): RoundState {
  return {
    clueRevealed: false,
    answerRevealed: false,
    marks: {},
    stealEnabled: false,
    steals: {},
    reps: {},
    repsConfirmed: false,
  }
}

export function emptyRounds(): RoundState[] {
  return Array.from({ length: TOTAL_ROUNDS }, emptyRound)
}

export function zeroScores(): Record<TeamId, number> {
  return { g1: 0, g3: 0, g4: 0, g5: 0, g6: 0 }
}
