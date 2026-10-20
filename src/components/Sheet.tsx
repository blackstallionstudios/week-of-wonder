import { useEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react'

interface SheetProps {
  open: boolean
  onClose(): void
  label: string
  children: ReactNode
  className?: string
  /** Full-height takeover instead of a bottom sheet. */
  full?: boolean
  /** Prevent dismissal by Esc / scrim / drag (used by the New Issue ritual). */
  locked?: boolean
}

const CLOSE_MS = 220

/**
 * Bottom sheet built on <dialog>.showModal() so we get the top layer, focus
 * containment and Esc handling from the platform. Drag the grabber down to
 * dismiss.
 */
export function Sheet({ open, onClose, label, children, className = '', full = false, locked = false }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [mounted, setMounted] = useState(open)
  const drag = useRef<{ y: number; dy: number } | null>(null)
  const [dy, setDy] = useState(0)

  if (open && !mounted) setMounted(true)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open) {
      if (!d.open) {
        d.showModal()
        // Focus the panel itself rather than the first control, so opening
        // a sheet doesn't paint a focus ring or pop the keyboard.
        d.querySelector<HTMLElement>('.sheet__panel')?.focus({ preventScroll: true })
      }
      return
    }
    // Let the exit animation play, then really close and unmount.
    const t = window.setTimeout(
      () => {
        if (d.open) d.close()
        setMounted(false)
      },
      d.open ? CLOSE_MS : 0,
    )
    return () => window.clearTimeout(t)
  }, [open, mounted])

  // Latest props for the native event listeners below.
  const live = useRef({ open, locked, onClose })
  useEffect(() => {
    live.current = { open, locked, onClose }
  })

  useEffect(() => {
    const d = ref.current
    if (!d) return
    const onCancel = (e: Event) => {
      e.preventDefault()
      if (!live.current.locked) live.current.onClose()
    }
    // Browsers may close a dialog natively (e.g. Chrome's close watcher on a
    // repeated Esc) without a cancelable "cancel" event. Keep React in sync.
    const onNativeClose = () => {
      if (!live.current.open) return
      if (live.current.locked) d.showModal()
      else live.current.onClose()
    }
    d.addEventListener('cancel', onCancel)
    d.addEventListener('close', onNativeClose)
    return () => {
      d.removeEventListener('cancel', onCancel)
      d.removeEventListener('close', onNativeClose)
    }
  }, [mounted])

  if (!mounted) return null
  const closing = !open

  const onPointerDown = (e: RPointerEvent) => {
    if (locked) return
    drag.current = { y: e.clientY, dy: 0 }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: RPointerEvent) => {
    if (!drag.current) return
    drag.current.dy = Math.max(0, e.clientY - drag.current.y)
    setDy(drag.current.dy)
  }
  const onPointerUp = () => {
    if (!drag.current) return
    const shouldClose = drag.current.dy > 90
    drag.current = null
    setDy(0)
    if (shouldClose) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={`sheet ${full ? 'sheet--full' : ''} ${closing ? 'is-closing' : ''} ${className}`}
      aria-label={label}
      onClick={(e) => {
        if (!locked && e.target === ref.current) onClose()
      }}
    >
      <div className="sheet__panel" tabIndex={-1} style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}>
        {!full && (
          <div
            className="sheet__grabber"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-hidden="true"
          >
            <span />
          </div>
        )}
        {children}
      </div>
    </dialog>
  )
}
