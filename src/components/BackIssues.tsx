import { useState, type CSSProperties } from 'react'
import { inkVar } from '../lib/inks'
import { formatWeekRange, issueNumber, parseKey } from '../lib/week'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

export function BackIssues() {
  const isOpen = useUI((s) => s.sheet?.kind === 'back')
  const close = useUI((s) => s.close)
  const backIssues = useStore((s) => s.backIssues)
  const reprint = useStore((s) => s.reprint)
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <Sheet open={isOpen} onClose={close} label="Back issues" className="sheet--back">
      <div className="sheet__head">
        <h2 className="sheet__title">Back Issues</h2>
        <button type="button" className="iconbtn" aria-label="Close" onClick={close}>
          <Icon name="close" />
        </button>
      </div>
      {backIssues.length === 0 ? (
        <p className="empty empty--small">
          No back issues yet. Finished tickets are filed here when a new week starts.
        </p>
      ) : (
        <ol className="issues">
          {backIssues.map((b) => {
            const done = b.items.filter((i) => i.fate === 'done').length
            const letGo = b.items.length - done
            const expanded = openKey === b.weekKey
            return (
              <li key={b.weekKey} className="issue">
                <button
                  type="button"
                  className="issue__head"
                  aria-expanded={expanded}
                  onClick={() => setOpenKey(expanded ? null : b.weekKey)}
                >
                  <span className="issue__no">Nº {issueNumber(b.weekKey)}</span>
                  <span className="issue__range">
                    {formatWeekRange(b.weekKey)} {parseKey(b.weekKey).getFullYear()}
                  </span>
                  <span className="issue__tally">
                    <b>{done}</b> printed{letGo > 0 && <> · {letGo} let go</>}
                  </span>
                  <span className="issue__spine" aria-hidden="true">
                    {b.items.slice(0, 24).map((i) => (
                      <i key={i.id + i.archivedAt} style={{ '--ink': inkVar(i.ink) } as CSSProperties} className={i.fate} />
                    ))}
                  </span>
                </button>
                {expanded && (
                  <ul className="issue__items">
                    {b.items.map((i) => (
                      <li key={i.id + i.archivedAt} className={`issue__item issue__item--${i.fate}`} style={{ '--ink': inkVar(i.ink) } as CSSProperties}>
                        <span className="issue__dot" aria-hidden="true" />
                        <span className="issue__title">{i.title}</span>
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={() => {
                            reprint(b.weekKey, i.id)
                            useUI.getState().toast({ message: `Reprinted “${i.title}” into Someday`, tone: 'ink' })
                          }}
                        >
                          Reprint
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </Sheet>
  )
}
