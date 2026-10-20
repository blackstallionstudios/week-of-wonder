import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useUI } from '../store/useUI'

/**
 * Everything outside an open modal <dialog> is inert, so toasts are portalled
 * into the topmost open dialog (or the body when none is open). That keeps
 * "Undo" and friends visible *and* tappable above sheets.
 */
function useToastHost(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const pick = () => {
      const open = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')]
      setHost(open[open.length - 1] ?? document.body)
    }
    pick()
    const mo = new MutationObserver(pick)
    mo.observe(document.body, { subtree: true, childList: true, attributeFilter: ['open'] })
    return () => mo.disconnect()
  }, [])
  return host
}

function ToastLayer({ children }: { children: ReactNode }) {
  const host = useToastHost()
  return host ? createPortal(<div className="toasts">{children}</div>, host) : null
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismissToast)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Check for a new edition every hour while the app stays open.
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000)
    },
  })

  return (
    <ToastLayer>
      <div role="status" aria-live="polite" className="toasts__live">
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
      {needRefresh && (
        <div className="update" role="alert">
          <span>A new edition is ready.</span>
          <button type="button" className="toast__action" onClick={() => void updateServiceWorker(true)}>
            Reload
          </button>
          <button type="button" className="toast__action toast__action--muted" onClick={() => setNeedRefresh(false)}>
            Later
          </button>
        </div>
      )}
    </ToastLayer>
  )
}
