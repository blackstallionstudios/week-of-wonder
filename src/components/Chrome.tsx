import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { issueNumber, weekKey } from '../lib/week'
import type { PaneId } from '../lib/types'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { Icon } from './Icon'
import { Pane } from './Pane'

export function Masthead() {
  const now = useUI((s) => s.now)
  const weekStart = useStore((s) => s.settings.weekStart)
  const open = useUI((s) => s.open)
  const issue = issueNumber(weekKey(now, weekStart))
  return (
    <header className="masthead">
      <div className="masthead__brand">
        <h1 className="wordmark">
          <span className="misreg" data-text="Week of Wonder">
            Week of Wonder
          </span>
        </h1>
        <p className="masthead__issue">
          Issue Nº <b data-testid="issue-number">{issue}</b> <span aria-hidden="true">·</span> {new Date(now).getFullYear()}
        </p>
      </div>
      <button type="button" className="iconbtn" aria-label="Menu" onClick={() => open({ kind: 'menu' })}>
        <Icon name="menu" />
      </button>
    </header>
  )
}

const PANES: PaneId[] = ['week', 'someday']

function scrollToPane(pane: PaneId, smooth = true) {
  document.getElementById(`pane-${pane}`)?.parentElement?.scrollIntoView({
    behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto',
    inline: 'start',
    block: 'nearest',
  })
}

export function PanePager() {
  const ref = useRef<HTMLDivElement>(null)
  const setActivePane = useUI((s) => s.setActivePane)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActivePane((e.target as HTMLElement).dataset.page as PaneId)
        }
      },
      { root: el, threshold: 0.6 },
    )
    el.querySelectorAll('.page').forEach((p) => io.observe(p))
    return () => io.disconnect()
  }, [setActivePane])

  return (
    <main className="pager" ref={ref}>
      {PANES.map((p) => (
        <div key={p} className={`page page--${p}`} data-page={p} role="tabpanel" id={`panel-${p}`} aria-labelledby={`tab-${p}`}>
          <Pane pane={p} />
        </div>
      ))}
    </main>
  )
}

export function BottomBar() {
  const active = useUI((s) => s.activePane)
  const open = useUI((s) => s.open)
  const counts = useStore(
    useShallow((s) => ({
      week: s.tasks.filter((t) => t.pane === 'week' && !t.done).length,
      someday: s.tasks.filter((t) => t.pane === 'someday' && !t.done).length,
    })),
  )
  return (
    <nav className="bottombar" aria-label="Panes">
      <div className="tabs" role="tablist" aria-label="Task panes">
        {PANES.map((p) => (
          <button
            key={p}
            id={`tab-${p}`}
            type="button"
            role="tab"
            aria-selected={active === p}
            aria-controls={`panel-${p}`}
            className={`tab tab--${p}`}
            onClick={() => scrollToPane(p)}
          >
            <span className="tab__label">{p === 'week' ? 'This Week' : 'Someday'}</span>
            <span className="tab__count" data-testid={`count-${p}`}>
              {counts[p]}
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="fab" aria-label="Add a task" onClick={() => open({ kind: 'add' })}>
        <span className="fab__blob" aria-hidden="true" />
        <Icon name="plus" size={28} />
      </button>
    </nav>
  )
}
