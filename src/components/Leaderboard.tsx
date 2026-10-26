import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import { useGame } from '../game/GameContext'
import { rankTeams } from '../game/logic'

export function AnimatedScore({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`relative inline-flex overflow-hidden ${className}`} aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '-100%', opacity: 0, scale: 1.6 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** Full leaderboard with animated re-ordering. Used in the overlay and on the finalize screen. */
export function Leaderboard({ big = false }: { big?: boolean }) {
  const state = useGame()
  const ranked = rankTeams(state.teams, state.scores)
  const top = Math.max(1, ...ranked.map((r) => r.score))
  const leaderScore = ranked[0]?.score ?? 0

  return (
    <LayoutGroup>
      <ol className="flex flex-col gap-3" aria-label="Leaderboard">
        {ranked.map(({ team, score, rank }) => {
          const leading = score === leaderScore && score > 0
          return (
            <motion.li
              key={team.id}
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`relative flex items-center gap-4 border-4 bg-void px-4 ${big ? 'py-4' : 'py-2.5'} hard-sm`}
              style={{ borderColor: team.color, ['--shadow' as string]: team.color }}
            >
              <span className={`t-hud w-14 text-center ${big ? 'text-6xl' : 'text-5xl'}`} style={{ color: team.color }}>
                #{rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`flex items-center gap-2 font-bold ${big ? 'text-4xl' : 'text-2xl'}`}>
                  <span className="truncate">{team.name}</span>
                  {leading && (
                    <motion.span
                      initial={{ rotate: -20, scale: 0 }}
                      animate={{ rotate: [-8, 8, -8], scale: 1 }}
                      transition={{ rotate: { repeat: Infinity, duration: 1.6 }, scale: { type: 'spring' } }}
                      className="text-acid"
                      aria-label="Leader"
                    >
                      <Crown size={big ? 34 : 26} fill="currentColor" />
                    </motion.span>
                  )}
                </div>
                <div className="mt-1.5 h-3 w-full bg-char-2">
                  <motion.div
                    className="h-full"
                    style={{ background: team.color }}
                    initial={false}
                    animate={{ width: `${(Math.max(0, score) / top) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
              <AnimatedScore value={score} className={`t-hud ${big ? 'text-8xl' : 'text-6xl'} min-w-[2ch] justify-end`} />
              {leading && (
                <motion.div
                  className="pointer-events-none absolute inset-0"
                  style={{ boxShadow: `0 0 28px ${team.color}` }}
                  animate={{ opacity: [0.3, 0.9, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                />
              )}
            </motion.li>
          )
        })}
      </ol>
    </LayoutGroup>
  )
}
