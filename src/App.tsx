import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { BookOpen, Home, ListOrdered, RefreshCw, Settings as SettingsIcon, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Arena } from './components/Arena'
import { Background } from './components/Background'
import { Finalize, Tiebreaker, WinnerScreen } from './components/Finale'
import { Intro } from './components/Intro'
import { Leaderboard } from './components/Leaderboard'
import { Lobby } from './components/Lobby'
import { AdjustPanel, HelpPanel, HistoryPanel, SettingsPanel } from './components/Panels'
import { QuestionEditor } from './components/QuestionEditor'
import { RepSelection } from './components/RepSelection'
import { RoundIntro } from './components/RoundIntro'
import { Modal, PixelSkull, UIProvider, useUI } from './components/ui'
import { GameProvider, useActions, useGame } from './game/GameContext'
import { formatRound, isFinalRound } from './game/logic'
import type { GameState } from './game/types'

function Screen() {
  const state = useGame()
  switch (state.phase) {
    case 'lobby':
      return <Lobby />
    case 'reps':
      return <RepSelection />
    case 'roundIntro':
      return <RoundIntro />
    case 'arena':
      return <Arena />
    case 'finalize':
      return <Finalize />
    case 'winner':
      return <WinnerScreen />
    case 'tiebreaker':
      return <Tiebreaker />
  }
}

function TopBar() {
  const state = useGame()
  const actions = useActions()
  const ui = useUI()
  const inGame = state.phase !== 'lobby'

  const restart = async () => {
    const ok = await ui.confirm({
      title: 'Restart the whole game?',
      body: 'All scores, judgements and the score log are wiped and you return to the lobby. Questions, teams and settings stay.',
      confirmLabel: 'Restart game',
      danger: true,
    })
    if (ok) actions.playAgain()
  }

  return (
    <div className="relative z-20 flex h-10 shrink-0 items-center justify-between gap-3 border-b-2 border-char-2 bg-void/70 px-3">
      <div className="flex items-center gap-2 font-pixel text-xl text-muted">
        <PixelSkull size={20} />
        <span>CRACK THE ETHICS CODE</span>
        {inGame && state.phase !== 'winner' && state.phase !== 'tiebreaker' && (
          <span className={isFinalRound(state.round) ? 'text-danger' : 'text-acid'}>· R{formatRound(state.round)}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        {inGame && (
          <>
            <button className="btn btn-ghost !border-2 !px-2 !py-0.5 !shadow-none" onClick={() => ui.open('leaderboard')}>
              <ListOrdered size={16} /> Leaderboard
            </button>
            <button className="btn btn-ghost !border-2 !px-2 !py-0.5 !shadow-none" onClick={actions.goLobby}>
              <Home size={16} /> Lobby
            </button>
            <button className="btn btn-ghost !border-2 !px-2 !py-0.5 !shadow-none" onClick={restart}>
              <RefreshCw size={16} /> Restart game
            </button>
          </>
        )}
        <button className="btn btn-ghost !border-2 !px-2 !py-0.5 !shadow-none" onClick={() => ui.open('help')}>
          <BookOpen size={16} /> Guide
        </button>
        <button className="btn btn-ghost !border-2 !px-2 !py-0.5 !shadow-none" onClick={() => ui.open('settings')}>
          <SettingsIcon size={16} /> Settings
        </button>
        <button
          className={`btn !border-2 !px-2 !py-0.5 !shadow-none ${state.settings.soundEnabled ? 'btn-ghost' : 'btn-pink'}`}
          onClick={() => actions.updateSettings({ soundEnabled: !state.settings.soundEnabled })}
          aria-pressed={!state.settings.soundEnabled}
          title="Mute / unmute (M)"
        >
          {state.settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {state.settings.soundEnabled ? 'Sound on' : 'Muted'}
        </button>
      </div>
    </div>
  )
}

function Overlays() {
  const ui = useUI()
  const titles = {
    leaderboard: 'Live leaderboard',
    settings: 'Teams and settings',
    editor: 'Question editor',
    adjust: 'Fix scores',
    history: 'Score review',
    help: 'Host guide',
  } as const
  return (
    <AnimatePresence>
      {ui.overlay && (
        <Modal
          key={ui.overlay}
          title={titles[ui.overlay]}
          onClose={ui.close}
          size={ui.overlay === 'leaderboard' || ui.overlay === 'adjust' ? 'lg' : 'xl'}
          tone={ui.overlay === 'leaderboard' ? 'pink' : ui.overlay === 'adjust' ? 'purple' : 'acid'}
        >
          {ui.overlay === 'leaderboard' && <Leaderboard big />}
          {ui.overlay === 'settings' && <SettingsPanel />}
          {ui.overlay === 'editor' && <QuestionEditor />}
          {ui.overlay === 'adjust' && <AdjustPanel />}
          {ui.overlay === 'history' && <HistoryPanel />}
          {ui.overlay === 'help' && <HelpPanel />}
        </Modal>
      )}
    </AnimatePresence>
  )
}

function Shell() {
  const state = useGame()
  const actions = useActions()
  const ui = useUI()
  const [introDone, setIntroDone] = useState(() => state.settings.skipIntro || state.phase !== 'lobby')
  const finishIntro = useCallback(() => setIntroDone(true), [])
  const boss = isFinalRound(state.round) && (state.phase === 'arena' || state.phase === 'roundIntro')
  const bossy = boss || state.phase === 'tiebreaker'

  // Mirror the motion preference onto <html> so CSS-only effects respect it too.
  useEffect(() => {
    document.documentElement.dataset.motion = state.settings.motion
  }, [state.settings.motion])

  // Global mute shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui.busy || e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      if (e.key.toLowerCase() === 'm') actions.updateSettings({ soundEnabled: !state.settings.soundEnabled })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actions, ui.busy, state.settings.soundEnabled])

  const screenKey = state.phase === 'arena' || state.phase === 'reps' || state.phase === 'roundIntro' ? `${state.phase}-${state.round}` : state.phase

  return (
    <MotionConfig reducedMotion={state.settings.motion === 'reduced' ? 'always' : state.settings.motion === 'full' ? 'never' : 'user'}>
      <div className="crt relative flex h-full flex-col overflow-hidden">
        <Background boss={bossy} intensity={state.phase === 'arena' || state.phase === 'tiebreaker' ? 0 : 1} />
        <TopBar />
        <div className="relative z-10 min-h-0 flex-1">
          {/* Entrance-only transition: the new screen is live the instant the phase changes,
              so a fast host never clicks into a screen that is about to be swapped out. */}
          <motion.div
            key={screenKey}
            className="h-full"
            initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Screen />
          </motion.div>
        </div>
        <Overlays />
        <AnimatePresence>{!introDone && <Intro key="intro" onDone={finishIntro} />}</AnimatePresence>
      </div>
    </MotionConfig>
  )
}

export default function App({ initial }: { initial?: GameState }) {
  return (
    <GameProvider initial={initial}>
      <UIProvider>
        <Shell />
      </UIProvider>
    </GameProvider>
  )
}
