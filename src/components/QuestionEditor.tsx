import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useActions, useGame } from '../game/GameContext'
import { OPTION_LETTERS } from '../game/logic'
import type { OptionIndex, Question } from '../game/types'
import { useUI } from './ui'

type Tab = number | 'tiebreaker'

function problems(q: Question): string[] {
  const out: string[] = []
  if (!q.text.trim()) out.push('Question text is empty.')
  q.options.forEach((o, i) => !o.trim() && out.push(`Option ${OPTION_LETTERS[i]} is empty.`))
  if (!q.clue.trim()) out.push('Clue is empty.')
  if (!q.explanation.trim()) out.push('Explanation is empty.')
  return out
}

export function QuestionEditor() {
  const state = useGame()
  const actions = useActions()
  const ui = useUI()
  const [tab, setTab] = useState<Tab>(0)
  const q = tab === 'tiebreaker' ? state.tiebreakerQuestion : state.questions[tab]
  const update = (patch: Partial<Question>) => actions.updateQuestion(tab, { ...q, ...patch })
  const issues = problems(q)
  const midGame = state.phase !== 'lobby'

  const resetAll = async () => {
    const ok = await ui.confirm({
      title: 'Restore the sample questions?',
      body: 'All six questions and the tiebreaker are replaced with the built-in samples.',
      confirmLabel: 'Restore samples',
      danger: true,
    })
    if (ok) actions.resetQuestions()
  }

  return (
    <div>
      <p className="mb-4 text-muted">
        These are sample questions on plagiarism and intellectual property. Replace them with your official six before the game. Changes save automatically.
      </p>
      {midGame && (
        <p className="mb-4 flex items-center gap-2 border-l-4 border-pink bg-pink/10 px-3 py-2 font-semibold text-pink">
          <AlertTriangle size={18} /> A game is in progress. Edits show up on screen immediately.
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Questions">
        {state.questions.map((qq, i) => (
          <button
            key={qq.id}
            role="tab"
            aria-selected={tab === i}
            className={`btn ${tab === i ? (i === 5 ? 'btn-danger' : 'btn-acid') : 'btn-ghost'}`}
            onClick={() => setTab(i)}
          >
            {i === 5 ? 'Boss' : `Q${i + 1}`}
            {problems(qq).length > 0 && <AlertTriangle size={14} />}
          </button>
        ))}
        <button role="tab" aria-selected={tab === 'tiebreaker'} className={`btn ${tab === 'tiebreaker' ? 'btn-pink' : 'btn-ghost'}`} onClick={() => setTab('tiebreaker')}>
          Tiebreaker
        </button>
      </div>

      <div className="grid gap-4" role="tabpanel">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Topic</span>
          <input value={q.topic} onChange={(e) => update({ topic: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Question</span>
          <textarea rows={3} value={q.text} onChange={(e) => update({ text: e.target.value })} className="text-lg" />
        </label>
        <fieldset className="grid gap-2">
          <legend className="mb-1 font-semibold">Options. Select the correct one.</legend>
          {q.options.map((opt, i) => (
            <div key={i} className={`flex items-center gap-3 border-2 px-2 py-1.5 ${q.correct === i ? 'border-acid bg-acid/10' : 'border-transparent'}`}>
              <input
                type="radio"
                name={`correct-${tab}`}
                checked={q.correct === i}
                onChange={() => update({ correct: i as OptionIndex })}
                aria-label={`Option ${OPTION_LETTERS[i]} is correct`}
                className="h-5 w-5 accent-[#c6ff00]"
              />
              <span className="font-pixel text-3xl text-pink">{OPTION_LETTERS[i]}</span>
              <input
                className="flex-1"
                value={opt}
                aria-label={`Option ${OPTION_LETTERS[i]}`}
                onChange={(e) => {
                  const options = [...q.options] as Question['options']
                  options[i] = e.target.value
                  update({ options })
                }}
              />
            </div>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Clue</span>
          <textarea rows={2} value={q.clue} onChange={(e) => update({ clue: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Explanation shown with the answer</span>
          <textarea rows={2} value={q.explanation} onChange={(e) => update({ explanation: e.target.value })} />
        </label>
        {issues.length > 0 && (
          <ul className="border-l-4 border-pink px-3 text-pink">
            {issues.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button className="btn btn-ghost" onClick={resetAll}>
          <RotateCcw size={16} /> Restore sample questions
        </button>
      </div>
    </div>
  )
}
