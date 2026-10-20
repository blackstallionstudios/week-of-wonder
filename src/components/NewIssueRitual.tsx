import { useMemo, type CSSProperties } from 'react'
import { inkVar } from '../lib/inks'
import { leftovers } from '../lib/rollover'
import { formatWeekRange, issueNumber, weekKey } from '../lib/week'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

/**
 * When a new week begins, unfinished This Week tickets don't silently roll
 * over. Each one gets a conscious decision: carry, defer, or let go.
 */
export function NewIssueRitual() {
  const now = useUI((s) => s.now)
  const tasks = useStore((s) => s.tasks)
  const weekStart = useStore((s) => s.settings.weekStart)
  const lastIssueKey = useStore((s) => s.lastIssueKey)
  const resolve = useStore((s) => s.resolveLeftover)
  const resolveAll = useStore((s) => s.resolveAllLeftovers)
  const current = weekKey(now, weekStart)
  const items = useMemo(() => leftovers(tasks, current), [tasks, current])
  const open = lastIssueKey === current && items.length > 0
  const issue = issueNumber(current)

  const finish = (fate: 'carry' | 'someday') => {
    resolveAll(
      items.map((t) => t.id),
      fate,
    )
    useUI.getState().toast({ message: fate === 'carry' ? 'All carried into the new issue' : 'All filed under Someday', tone: 'ink' })
  }

  return (
    <Sheet open={open} onClose={() => {}} label={`Issue ${issue} is out`} full locked className="sheet--ritual">
      <div className="ritual">
        <div className="ritual__hero">
          <span className="ritual__burst" aria-hidden="true" />
          <p className="kicker">
            <span>{formatWeekRange(current)}</span>
            <span aria-hidden="true">✺</span>
            <span>Fresh off the press</span>
          </p>
          <h2 className="ritual__title">
            <span className="misreg" data-text={`Issue Nº ${issue}`}>
              Issue Nº {issue}
            </span>
            <em>is out.</em>
          </h2>
          <p className="ritual__lede">
            {items.length === 1 ? 'One ticket' : `${items.length} tickets`} didn’t make it to print last week. Decide each
            one’s fate.
          </p>
        </div>

        <ul className="ritual__list">
          {items.map((t) => (
            <li key={t.id} className="ritual__item" style={{ '--ink': inkVar(t.ink) } as CSSProperties} data-testid="leftover">
              <div className="ritual__ticket">
                <span className="ritual__stub" aria-hidden="true" />
                <span className="ritual__name">{t.title}</span>
                {t.weekKey && <span className="ritual__from">Nº {issueNumber(t.weekKey)}</span>}
              </div>
              <div className="ritual__choices" role="group" aria-label={`Fate of ${t.title}`}>
                <button type="button" className="fate fate--carry" onClick={() => resolve(t.id, 'carry')}>
                  <Icon name="arrowRight" size={16} /> Carry over
                </button>
                <button type="button" className="fate fate--someday" onClick={() => resolve(t.id, 'someday')}>
                  <Icon name="cloud" size={16} /> Someday
                </button>
                <button type="button" className="fate fate--letgo" onClick={() => resolve(t.id, 'let-go')}>
                  <Icon name="close" size={16} /> Let go
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="ritual__bulk">
          <button type="button" className="btn btn--ink" onClick={() => finish('carry')}>
            Carry all over
          </button>
          <button type="button" className="btn btn--outline" onClick={() => finish('someday')}>
            Send all to Someday
          </button>
        </div>
      </div>
    </Sheet>
  )
}
