import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useMemo, useState, type CSSProperties } from 'react'
import { inkName, inkVar, INK_IDS, type InkId } from '../lib/inks'
import { arrayMove, groupByInk, listPane } from '../lib/tasks'
import type { PaneId } from '../lib/types'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { Icon } from './Icon'
import { InstallHint } from './InstallHint'
import { PaneHeader } from './PaneHeader'
import { TaskCard } from './TaskCard'

export function Pane({ pane }: { pane: PaneId }) {
  const tasks = useStore((s) => s.tasks)
  const view = useStore((s) => s.view[pane])
  const { setSort, toggleFilter, clearFilter, setShowDone, reorderVisible, clearDone } = useStore.getState()
  const listing = useMemo(() => listPane(tasks, pane, view), [tasks, pane, view])
  const usedInks = useMemo(() => {
    const used = new Set(tasks.filter((t) => t.pane === pane).map((t) => t.ink))
    return INK_IDS.filter((id) => used.has(id) || view.filter.includes(id))
  }, [tasks, pane, view.filter])
  const [announce, setAnnounce] = useState('')
  const total = tasks.filter((t) => t.pane === pane).length

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 260, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const manual = view.sort === 'manual'
  const ids = listing.open.map((t) => t.id)

  const onDragStart = () => navigator.vibrate?.(8)
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    reorderVisible(pane, arrayMove(ids, from, to))
    setAnnounce(`Moved to position ${to + 1} of ${ids.length}`)
  }

  const allDone = listing.open.length === 0 && listing.done.length > 0 && view.filter.length === 0

  return (
    <section className={`pane pane--${pane}`} id={`pane-${pane}`} aria-labelledby={`pane-title-${pane}`} data-pane={pane}>
      <PaneHeader pane={pane} openCount={listing.open.length + listing.hiddenByFilter} doneCount={tasks.filter((t) => t.pane === pane && t.done).length} />
      {pane === 'week' && <InstallHint />}

      {total > 0 && (
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Sort">
            <button type="button" aria-pressed={manual} onClick={() => setSort(pane, 'manual')}>
              Manual
            </button>
            <button type="button" aria-pressed={!manual} onClick={() => setSort(pane, 'ink')}>
              <span className="seg__spectrum" aria-hidden="true" />
              By ink
            </button>
          </div>
          {usedInks.length > 0 && (
            <div className="chips" role="group" aria-label="Filter by ink">
              {usedInks.map((id: InkId) => (
                <button
                  key={id}
                  type="button"
                  className="chip"
                  aria-pressed={view.filter.includes(id)}
                  aria-label={`Only ${inkName(id)}`}
                  title={inkName(id)}
                  style={{ '--ink': inkVar(id) } as CSSProperties}
                  onClick={() => toggleFilter(pane, id)}
                />
              ))}
              {view.filter.length > 0 && (
                <button type="button" className="chip chip--clear" onClick={() => clearFilter(pane)} aria-label="Clear ink filter">
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {listing.open.length === 0 && listing.done.length === 0 && (
        view.filter.length > 0 ? (
          <p className="empty empty--small">
            No tickets in that ink.{' '}
            <button type="button" className="linkish" onClick={() => clearFilter(pane)}>
              Show all
            </button>
          </p>
        ) : (
          <EmptyState pane={pane} />
        )
      )}

      {allDone && (
        <div className="fullyprinted" role="status">
          <span className="fullyprinted__burst" aria-hidden="true" />
          <strong>{pane === 'week' ? 'Issue fully printed!' : 'Drawer cleared!'}</strong>
          <span>Every ticket is done. Take the rest of the day off, maybe.</span>
        </div>
      )}

      {manual ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          autoScroll={{ threshold: { x: 0, y: 0.18 } }}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="tickets" aria-label={`${pane === 'week' ? 'This week' : 'Someday'} tasks`}>
              {listing.open.map((t, i) => (
                <TaskCard key={t.id} task={t} draggable index={i} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        groupByInk(listing.open).map((g) => (
          <div key={g.ink ?? 'plain'} className="inkgroup" style={{ '--ink': inkVar(g.ink) } as CSSProperties}>
            <h3 className="inkgroup__title">
              <span className="inkgroup__swatch" aria-hidden="true" />
              {inkName(g.ink)}
              <span className="inkgroup__count">{g.tasks.length}</span>
            </h3>
            <ul className="tickets">
              {g.tasks.map((t, i) => (
                <TaskCard key={t.id} task={t} draggable={false} index={i} />
              ))}
            </ul>
          </div>
        ))
      )}

      {listing.done.length > 0 && (
        <div className="printed">
          <button
            type="button"
            className="printed__toggle"
            aria-expanded={view.showDone}
            onClick={() => setShowDone(pane, !view.showDone)}
          >
            <span className="printed__rule" aria-hidden="true" />
            <span>
              Printed <b>{listing.done.length}</b>
            </span>
            <Icon name="chevron" size={18} className={view.showDone ? 'rot' : ''} />
            <span className="printed__rule" aria-hidden="true" />
          </button>
          {view.showDone && (
            <>
              <ul className="tickets tickets--done">
                {listing.done.map((t, i) => (
                  <TaskCard key={t.id} task={t} draggable={false} index={i} />
                ))}
              </ul>
              <button
                type="button"
                className="btn btn--ghost btn--small printed__clear"
                onClick={() => {
                  const n = clearDone(pane)
                  useUI.getState().toast({ message: `Filed ${n} into Back Issues` })
                }}
              >
                <Icon name="archive" size={16} /> File printed into Back Issues
              </button>
            </>
          )}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </section>
  )
}

function EmptyState({ pane }: { pane: PaneId }) {
  return (
    <div className={`empty empty--${pane}`}>
      <svg className="empty__art" viewBox="0 0 200 140" aria-hidden="true">
        {pane === 'week' ? (
          <>
            <circle cx="86" cy="72" r="46" fill="var(--week)" opacity="0.85" />
            <circle cx="118" cy="66" r="40" fill="var(--ink-sunflower)" opacity="0.85" style={{ mixBlendMode: 'var(--overprint)' as CSSProperties['mixBlendMode'] }} />
            <path d="M40 120h120" stroke="var(--key)" strokeWidth="3" strokeLinecap="round" />
            <path d="M58 104h84" stroke="var(--key)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 9" />
          </>
        ) : (
          <>
            <path d="M30 96c10-40 50-62 90-52s52 44 46 60" fill="none" stroke="var(--someday)" strokeWidth="14" strokeLinecap="round" opacity="0.85" />
            <circle cx="140" cy="38" r="16" fill="var(--ink-sunflower)" opacity="0.9" />
            <circle cx="56" cy="40" r="3" fill="var(--key)" />
            <circle cx="92" cy="22" r="2.5" fill="var(--key)" />
            <circle cx="170" cy="78" r="2.5" fill="var(--key)" />
            <path d="M40 124h120" stroke="var(--key)" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
      </svg>
      <p className="empty__title">{pane === 'week' ? 'Nothing on the press.' : 'The someday drawer is empty.'}</p>
      <p className="empty__text">
        {pane === 'week' ? 'Tap the + to set some type for this week.' : 'Big dreams, small errands — no deadline required.'}
      </p>
    </div>
  )
}
