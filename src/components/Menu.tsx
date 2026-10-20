import { useRef, useState } from 'react'
import { isIOS, isStandalone, useInstallPrompt } from '../lib/install'
import type { ThemePref, WeekStart } from '../lib/types'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

export function Menu() {
  const isOpen = useUI((s) => s.sheet?.kind === 'menu')
  const close = useUI((s) => s.close)
  return (
    <Sheet open={isOpen} onClose={close} label="Menu" className="sheet--menu">
      {isOpen && <MenuBody />}
    </Sheet>
  )
}

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'Auto' },
  { id: 'light', label: 'Paper' },
  { id: 'dark', label: 'Night' },
]

function backupFilename(): string {
  return `week-of-wonder-${new Date().toISOString().slice(0, 10)}.json`
}

function MenuBody() {
  const settings = useStore((s) => s.settings)
  const backCount = useStore((s) => s.backIssues.length)
  const { setTheme, setWeekStart, exportData, importData, reset } = useStore.getState()
  const { open, close, toast } = useUI.getState()
  const { canPrompt, install } = useInstallPrompt()
  const file = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const standalone = isStandalone()

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFilename()
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast({ message: 'Backup saved' })
  }

  const doImport = async (f: File) => {
    try {
      importData(await f.text())
      close()
      toast({ message: 'Backup restored', tone: 'ink' })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not read that file' })
    }
  }

  return (
    <div className="menu">
      <div className="sheet__head">
        <h2 className="sheet__title">Colophon</h2>
        <button type="button" className="iconbtn" aria-label="Close" onClick={close}>
          <Icon name="close" />
        </button>
      </div>

      <div className="menu__group">
        <h3 className="section-label">Stock</h3>
        <div className="seg seg--wide" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={settings.theme === t.id} onClick={() => setTheme(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="menu__group">
        <h3 className="section-label">New issue every</h3>
        <div className="seg seg--wide" role="radiogroup" aria-label="Week starts on">
          {([1, 0] as WeekStart[]).map((d) => (
            <button key={d} type="button" role="radio" aria-checked={settings.weekStart === d} onClick={() => setWeekStart(d)}>
              {d === 1 ? 'Monday' : 'Sunday'}
            </button>
          ))}
        </div>
      </div>

      <div className="menu__group menu__list">
        <button type="button" className="menurow" onClick={() => open({ kind: 'back' })}>
          <Icon name="archive" /> <span>Back Issues</span>
          <span className="menurow__meta">{backCount}</span>
        </button>
        <button type="button" className="menurow" onClick={doExport}>
          <Icon name="download" /> <span>Save a backup</span>
          <span className="menurow__meta">.json</span>
        </button>
        <button type="button" className="menurow" onClick={() => file.current?.click()}>
          <Icon name="upload" /> <span>Restore a backup</span>
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          data-testid="import-input"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void doImport(f)
            e.target.value = ''
          }}
        />
        {!standalone && canPrompt && (
          <button type="button" className="menurow menurow--ink" onClick={() => void install()}>
            <Icon name="phone" /> <span>Install on this device</span>
          </button>
        )}
      </div>

      {!standalone && !canPrompt && isIOS() && (
        <p className="menu__tip">
          <Icon name="share" size={16} />
          <span>
            To install: tap <b>Share</b>, then <b>Add to Home Screen</b>.
          </span>
        </p>
      )}

      <div className="menu__group">
        {confirmReset ? (
          <div className="menu__confirm" role="alert">
            <p>Erase every ticket and back issue on this device?</p>
            <div className="menu__confirm-row">
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmReset(false)}>
                Keep them
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  reset()
                  useStore.getState().checkRollover()
                  close()
                  toast({ message: 'Fresh paper loaded' })
                }}
              >
                Erase all
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="linkish linkish--danger" onClick={() => setConfirmReset(true)}>
            Erase everything…
          </button>
        )}
      </div>

      <p className="menu__colophon">
        Printed locally on this device. Works offline.
        <br />
        Set in Bricolage Grotesque, Instrument Serif &amp; Space Mono.
      </p>
    </div>
  )
}
