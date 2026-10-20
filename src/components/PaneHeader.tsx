import type { CSSProperties } from 'react'
import type { PaneId } from '../lib/types'
import { DAY_LETTERS, daysLeft, dateKey, formatWeekRange, weekDays, weekKey, weekProgress } from '../lib/week'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'

interface Props {
  pane: PaneId
  openCount: number
  doneCount: number
}

export function PaneHeader({ pane, openCount, doneCount }: Props) {
  const now = useUI((s) => s.now)
  const weekStart = useStore((s) => s.settings.weekStart)

  if (pane === 'someday') {
    return (
      <header className="panehead panehead--someday">
        <p className="kicker">
          <span>No deadline</span>
          <span aria-hidden="true">✺</span>
          <span>No pressure</span>
        </p>
        <h2 id="pane-title-someday" className="panehead__title">
          <span className="misreg" data-text="Someday">
            Someday
          </span>
          <em className="panehead__aside">/ no rush</em>
        </h2>
        <p className="panehead__stats">
          <b>{openCount}</b> waiting <span aria-hidden="true">·</span> <b>{doneCount}</b> printed
        </p>
      </header>
    )
  }

  const key = weekKey(now, weekStart)
  const today = dateKey(new Date(now))
  const progress = weekProgress(now, weekStart)
  const left = daysLeft(now, weekStart)

  return (
    <header className="panehead panehead--week">
      <p className="kicker">
        <span>{formatWeekRange(key)}</span>
        <span aria-hidden="true">✺</span>
        <span>
          {left} {left === 1 ? 'day' : 'days'} left
        </span>
      </p>
      <h2 id="pane-title-week" className="panehead__title">
        <span className="misreg" data-text="This Week">
          This Week
        </span>
      </h2>
      <ol className="daystrip" aria-label="Days of this week">
        {weekDays(key).map((d) => {
          const k = dateKey(d)
          const state = k < today ? 'past' : k === today ? 'today' : 'future'
          return (
            <li key={k} className={`day day--${state}`} aria-current={state === 'today' ? 'date' : undefined}>
              <span className="day__letter">{DAY_LETTERS[d.getDay()]}</span>
              <span className="day__num">{d.getDate()}</span>
            </li>
          )
        })}
      </ol>
      <div className="printrun" role="img" aria-label={`${Math.round(progress * 100)}% of the week has passed`}>
        <span className="printrun__bar" style={{ '--p': progress } as CSSProperties} />
      </div>
      <p className="panehead__stats">
        <b>{openCount}</b> to go <span aria-hidden="true">·</span> <b>{doneCount}</b> printed
      </p>
    </header>
  )
}
