import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { initialState } from './game/reducer'
import { STORAGE_KEY } from './game/storage'

function setup() {
  const init = initialState()
  init.settings = { ...init.settings, skipIntro: true, motion: 'reduced', soundEnabled: false }
  return render(<App initial={init} />)
}

/** Waits until the button exists and is enabled, then clicks it. */
const click = async (name: RegExp | string) => {
  const btn = await waitFor(() => {
    const b = screen.getByRole('button', { name })
    if (b.hasAttribute('disabled')) throw new Error(`${String(name)} is disabled`)
    return b
  })
  await act(async () => {
    fireEvent.click(btn)
  })
  return btn
}

async function confirmDialog(name: RegExp) {
  const dialog = await screen.findByRole('dialog')
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name }))
  })
}

describe('full game through the UI', () => {
  it('plays six rounds to the winner screen', { timeout: 30000 }, async () => {
    setup()
    await click(/START GAME/)

    for (let round = 1; round <= 6; round++) {
      // Representative selection
      if (round === 1) {
        await click(/Random pick/)
        await click(/Lock in representatives/)
      } else {
        await click(/Skip names/)
      }
      await click(round === 6 ? /Fight the boss/ : /Enter the arena/)

      // Arena
      await screen.findByRole('navigation', { name: 'Host controls' })
      await click(/Start timer/)
      if (round === 2) {
        await click(/Reveal clue/)
        expect((await screen.findByRole('button', { name: /Clue revealed/ })).hasAttribute('disabled')).toBe(true)
      }
      // Group 4 always right; Group 1 wrong.
      await click(/Mark Group 4 correct/)
      await click(/Mark Group 1 incorrect/)
      // Duplicate judging is impossible: buttons disappear once judged.
      await waitFor(() => expect(screen.queryByRole('button', { name: /Mark Group 4 correct/ })).toBeNull())
      await click(/Reveal answer/)
      await screen.findByText(/ANSWER [ABCD]:/)
      await click(round === 6 ? /Finish game/ : /Next round/)
    }

    // Finalize → winner
    await click(/Lock scores and reveal winner/)
    await confirmDialog(/Lock scores and reveal winner/)
    await click(/^Skip$/)
    await screen.findByText('CHAMPION')
    const podium = screen.getByLabelText('Podium')
    // 5 rounds × 2 + 1 clue round = 11
    expect(within(podium).getByText('11')).toBeTruthy()
    expect(within(podium).getAllByText('Group 4').length).toBeGreaterThan(0)

    // Review scores opens the log
    await click(/Review scores/)
    expect(await screen.findByText(/Score log, newest first/)).toBeTruthy()
  })

  it('undo and fix scores work from the arena', async () => {
    setup()
    await click(/START GAME/)
    await click(/Skip names/)
    await click(/Enter the arena/)
    await click(/Mark Group 3 correct/)
    await waitFor(() => expect(screen.queryByRole('button', { name: /Mark Group 3 correct/ })).toBeNull())
    await click(/^Undo/)
    expect(await screen.findByRole('button', { name: /Mark Group 3 correct, plus 2/ })).toBeTruthy()

    await click(/Fix scores/)
    const dialog = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /Plus one point for Group 6/ }))
    })
    await act(async () => {
      fireEvent.change(within(dialog).getByLabelText(/Set exact score for Group 5/), { target: { value: '7' } })
      fireEvent.click(within(dialog).getAllByRole('button', { name: 'Set' })[3])
    })
    const saved = await waitFor(() => {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw && JSON.parse(raw)
      expect(parsed?.scores?.g5).toBe(7)
      return parsed
    })
    expect(saved.scores.g6).toBe(1)
  })

  it('restart asks for confirmation', async () => {
    setup()
    await click(/START GAME/)
    await click(/Restart game/)
    expect(await screen.findByRole('dialog', { name: /Restart the whole game/ })).toBeTruthy()
    await confirmDialog(/^Restart game$/)
    expect(await screen.findByRole('button', { name: /START GAME/ })).toBeTruthy()
  })

  it('question editor edits persist', async () => {
    setup()
    await click(/Edit questions/)
    const dialog = await screen.findByRole('dialog', { name: 'Question editor' })
    await act(async () => {
      fireEvent.change(within(dialog).getByLabelText('Option A'), { target: { value: 'Brand new option' } })
    })
    await waitFor(() => {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      expect(parsed.questions[0].options[0]).toBe('Brand new option')
    })
  })
})
