import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type Overlay = 'leaderboard' | 'settings' | 'editor' | 'adjust' | 'history' | 'help' | null

interface ConfirmOptions {
  title: string
  body?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
}

interface UIContextValue {
  overlay: Overlay
  open: (o: Exclude<Overlay, null>) => void
  close: () => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  /** True while any modal is up — gameplay shortcuts pause. */
  busy: boolean
}

const UICtx = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve })),
    [],
  )
  const settle = (v: boolean) => {
    pending?.resolve(v)
    setPending(null)
  }

  const value = useMemo<UIContextValue>(
    () => ({
      overlay,
      open: (o) => setOverlay(o),
      close: () => setOverlay(null),
      confirm,
      busy: overlay !== null || pending !== null,
    }),
    [overlay, pending, confirm],
  )

  return (
    <UICtx.Provider value={value}>
      {children}
      <AnimatePresence>
        {pending && (
          <Modal key="confirm" title={pending.title} onClose={() => settle(false)} size="sm" tone={pending.danger ? 'danger' : 'acid'}>
            {pending.body && <div className="text-lg text-paper/90">{pending.body}</div>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button className="btn btn-ghost" onClick={() => settle(false)}>
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                autoFocus
                className={`btn ${pending.danger ? 'btn-danger' : 'btn-acid'}`}
                onClick={() => settle(true)}
              >
                {pending.confirmLabel}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </UICtx.Provider>
  )
}

export function useUI(): UIContextValue {
  const v = useContext(UICtx)
  if (!v) throw new Error('useUI must be used inside UIProvider')
  return v
}

const TONES = {
  acid: 'var(--color-acid)',
  pink: 'var(--color-pink)',
  purple: 'var(--color-purple)',
  danger: 'var(--color-danger)',
} as const

/** Open modals, innermost last; only the top one reacts to Escape/Tab. */
const modalStack: symbol[] = []

export function Modal({
  title,
  onClose,
  children,
  size = 'md',
  tone = 'acid',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: keyof typeof TONES
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const me = Symbol('modal')
    modalStack.push(me)
    const prev = document.activeElement as HTMLElement | null
    const el = ref.current
    if (el && !el.contains(document.activeElement)) {
      const first = el.querySelector<HTMLElement>('[autofocus], button, input, select, textarea')
      first?.focus()
    }
    const onKey = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== me) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
      }
      // Keep Tab inside the dialog.
      if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
          (n) => !n.hasAttribute('disabled'),
        )
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      modalStack.splice(modalStack.indexOf(me), 1)
      prev?.focus?.()
    }
  }, [])

  const width = { sm: 'max-w-lg', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }[size]

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[92vh] w-full ${width} flex-col border-4 bg-char hard`}
        style={{ borderColor: TONES[tone], ['--shadow' as string]: TONES[tone] }}
        initial={{ scale: 0.9, y: 20, rotate: -1 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      >
        <div className="flex items-center justify-between gap-4 border-b-4 px-5 py-3" style={{ borderColor: TONES[tone] }}>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <button className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
      </motion.div>
    </motion.div>
  )
}

/** Pixel-art skull drawn on an 8×8 grid (original artwork). */
export function PixelSkull({ size = 32, color = 'var(--color-acid)', className = '' }: { size?: number; color?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" className={`pixelated ${className}`} aria-hidden="true">
      <path fill={color} d="M2 0h4v1h1v1h1v3h-1v1h-1v2h-4v-2h-1v-1h-1v-3h1v-1h1z" />
      <path fill="var(--color-void)" d="M2 3h1v2h-1zM5 3h1v2h-1zM3.5 5h1v1h-1zM3 7h0.5v1h-0.5zM4.5 7h0.5v1h-0.5z" />
    </svg>
  )
}

/** Kbd hint that hides itself on narrow screens. */
export function K({ children }: { children: ReactNode }) {
  return <kbd className="ml-1 hidden 2xl:inline">{children}</kbd>
}
