import { useEffect, useRef, type RefObject } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useUI } from '../store/useUI'

/**
 * Toasts live in a manual popover so they render in the top layer, above any
 * open <dialog> sheet. Re-showing moves them above the newest dialog.
 */
function useTopLayer(ref: RefObject<HTMLElement | null>, visible: boolean, dep: unknown) {
  useEffect(() => {
    const el = ref.current
    if (!el || !('showPopover' in el)) return
    try {
      if (el.matches(':popover-open')) el.hidePopover()
      if (visible) el.showPopover()
    } catch {
      /* popover unsupported or element detached */
    }
  }, [ref, visible, dep])
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts)
  const sheet = useUI((s) => s.sheet)
  const dismiss = useUI((s) => s.dismissToast)
  const ref = useRef<HTMLDivElement>(null)
  useTopLayer(ref, toasts.length > 0, `${toasts[0]?.id}-${sheet?.kind}`)
  return (
    <div ref={ref} className="toasts" role="status" aria-live="polite" popover="manual">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone === 'ink' ? 'toast--ink' : ''}`}>
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Check for a new edition every hour while the app stays open.
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000)
    },
  })
  return <UpdateBanner show={needRefresh} onReload={() => void updateServiceWorker(true)} onLater={() => setNeedRefresh(false)} />
}

function UpdateBanner({ show, onReload, onLater }: { show: boolean; onReload(): void; onLater(): void }) {
  const ref = useRef<HTMLDivElement>(null)
  useTopLayer(ref, show, show)
  return (
    <div ref={ref} className="toasts" popover="manual">
      {show && (
        <div className="update" role="alert">
          <span>A new edition is ready.</span>
          <button type="button" className="toast__action" onClick={onReload}>
            Reload
          </button>
          <button type="button" className="toast__action toast__action--muted" onClick={onLater}>
            Later
          </button>
        </div>
      )}
    </div>
  )
}
