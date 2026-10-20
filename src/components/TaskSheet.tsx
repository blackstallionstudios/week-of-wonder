import { useState, type CSSProperties } from 'react'
import { completeTask, deleteWithUndo, findLinks, moveWithToast, prettyHost } from '../lib/actions'
import { inkName, inkOnVar, inkVar } from '../lib/inks'
import type { Task } from '../lib/types'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { AutoTextarea } from './AutoTextarea'
import { Icon } from './Icon'
import { InkPicker } from './InkPicker'
import { Sheet } from './Sheet'
import { SubtaskList } from './SubtaskList'

export function TaskSheet() {
  const sheet = useUI((s) => s.sheet)
  const close = useUI((s) => s.close)
  const id = sheet?.kind === 'task' ? sheet.id : null
  const task = useStore((s) => (id ? s.tasks.find((t) => t.id === id) : undefined))
  // Keep showing the last task while the sheet animates closed.
  const [last, setLast] = useState<Task | undefined>(task)
  if (task && task !== last) setLast(task)
  const shown = task ?? last

  return (
    <Sheet open={!!task} onClose={close} label={shown ? `Ticket: ${shown.title}` : 'Ticket'} className="sheet--task">
      {shown && <TaskDetail key={shown.id} task={shown} />}
    </Sheet>
  )
}

function TaskDetail({ task }: { task: Task }) {
  const { updateTask, duplicateTask } = useStore.getState()
  const [title, setTitle] = useState(task.title)
  const links = findLinks(task.notes)
  const other = task.pane === 'week' ? 'someday' : 'week'

  return (
    <article
      className={`detail ${task.done ? 'is-done' : ''}`}
      style={{ '--ink': inkVar(task.ink), '--on-ink': inkOnVar(task.ink) } as CSSProperties}
    >
      <div className="detail__band" aria-hidden="true">
        <span>{inkName(task.ink)}</span>
        <span>{task.pane === 'week' ? 'This Week' : 'Someday'}</span>
        <span>№ {task.id.slice(0, 4).toUpperCase()}</span>
      </div>

      <div className="detail__titlerow">
        <button
          type="button"
          className="stampbox stampbox--big"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? 'Mark not done' : 'Mark done'}
          onClick={() => completeTask(task.id)}
        >
          <Icon name="check" size={24} />
        </button>
        <AutoTextarea
          className="detail__title"
          value={title}
          aria-label="Title"
          maxLength={200}
          enterKeyHint="done"
          onChange={(e) => {
            const v = e.target.value.replace(/\n/g, ' ')
            setTitle(v)
            if (v.trim()) updateTask(task.id, { title: v.trim() })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
          onBlur={() => setTitle(useStore.getState().tasks.find((t) => t.id === task.id)?.title ?? title)}
        />
      </div>

      <section aria-labelledby="ink-title">
        <h3 className="section-label" id="ink-title">
          Ink
        </h3>
        <InkPicker value={task.ink} onChange={(ink) => updateTask(task.id, { ink })} label="Task ink" />
      </section>

      <SubtaskList task={task} />

      <section className="notes" aria-labelledby="notes-title">
        <h3 className="section-label" id="notes-title">
          Notes
        </h3>
        <AutoTextarea
          className="notes__area"
          value={task.notes}
          placeholder="Scribble in the margins…"
          aria-label="Notes"
          onChange={(e) => updateTask(task.id, { notes: e.target.value })}
        />
        {links.length > 0 && (
          <ul className="notes__links">
            {links.map((href) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noopener noreferrer">
                  <Icon name="link" size={14} /> {prettyHost(href)}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="detail__actions">
        <button type="button" className="btn btn--outline" onClick={() => moveWithToast(task.id, other)}>
          <Icon name={other === 'someday' ? 'cloud' : 'calendar'} size={18} />
          {other === 'someday' ? 'Move to Someday' : 'Pull into This Week'}
        </button>
        <div className="detail__actions-row">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              const id = duplicateTask(task.id)
              if (id) useUI.getState().open({ kind: 'task', id })
              useUI.getState().toast({ message: 'Reprinted a copy' })
            }}
          >
            <Icon name="copy" size={18} /> Duplicate
          </button>
          <button type="button" className="btn btn--danger" onClick={() => deleteWithUndo(task.id)}>
            <Icon name="trash" size={18} /> Delete
          </button>
        </div>
        <p className="detail__stamp">
          Set {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          {task.doneAt && ` · Printed ${new Date(task.doneAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
        </p>
      </footer>
    </article>
  )
}
