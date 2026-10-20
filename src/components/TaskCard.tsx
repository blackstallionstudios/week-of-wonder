import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useState, type CSSProperties } from 'react'
import { completeTask } from '../lib/actions'
import { inkName, inkOnVar, inkVar } from '../lib/inks'
import { subtaskProgress } from '../lib/tasks'
import type { Task } from '../lib/types'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { Icon } from './Icon'

interface TaskCardProps {
  task: Task
  draggable: boolean
  /** Index in the list; used for the gentle "pinboard" tilt in Someday. */
  index: number
}

export function TaskCard({ task, draggable, index }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !draggable,
  })
  const open = useUI((s) => s.open)
  const stamped = useUI((s) => s.stamped === task.id)
  const toggleSubtask = useStore((s) => s.toggleSubtask)
  const [expanded, setExpanded] = useState(false)
  const { done: subDone, total } = subtaskProgress(task)

  useEffect(() => {
    if (!stamped) return
    const t = window.setTimeout(() => useUI.getState().stamp(null), 1100)
    return () => window.clearTimeout(t)
  }, [stamped])

  const style = {
    '--ink': inkVar(task.ink),
    '--on-ink': inkOnVar(task.ink),
    '--tilt': `${((index * 37) % 5) - 2}`,
    transform: CSS.Translate.toString(transform),
    transition,
  } as CSSProperties

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`ticket ${task.done ? 'is-done' : ''} ${isDragging ? 'is-dragging' : ''} ${stamped ? 'is-stamped' : ''}`}
      data-testid="task"
      data-task-id={task.id}
      data-ink={task.ink ?? 'plain'}
      {...listeners}
      aria-roledescription={draggable ? 'sortable ticket' : undefined}
      aria-describedby={draggable ? attributes['aria-describedby'] : undefined}
    >
      <div className="ticket__stub" aria-hidden="true" />
      <button
        type="button"
        className="stampbox"
        role="checkbox"
        aria-checked={task.done}
        aria-label={`${task.done ? 'Mark not done' : 'Mark done'}: ${task.title}`}
        onClick={() => completeTask(task.id)}
      >
        <Icon name="check" size={18} />
      </button>
      <button
        type="button"
        className="ticket__body"
        onClick={() => open({ kind: 'task', id: task.id })}
        aria-label={`Open ${task.title}`}
      >
        <span className="ticket__title">{task.title}</span>
        {(total > 0 || task.notes.trim() || task.ink) && (
          <span className="ticket__meta">
            {task.ink && <span className="ticket__inkname">{inkName(task.ink)}</span>}
            {total > 0 && (
              <span className="dots" aria-label={`${subDone} of ${total} subtasks done`}>
                {task.subtasks.slice(0, 8).map((s) => (
                  <i key={s.id} className={s.done ? 'on' : ''} />
                ))}
                <b>
                  {subDone}/{total}
                </b>
              </span>
            )}
            {task.notes.trim() && (
              <span className="ticket__hasnotes" aria-label="Has notes">
                <Icon name="notes" size={14} />
              </span>
            )}
          </span>
        )}
      </button>
      {total > 0 && !task.done && (
        <button
          type="button"
          className={`ticket__expand ${expanded ? 'is-open' : ''}`}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide subtasks' : 'Show subtasks'}
          onClick={() => setExpanded((v) => !v)}
        >
          <Icon name="chevron" size={20} />
        </button>
      )}
      {expanded && total > 0 && !task.done && (
        <ul className="ticket__subs">
          {task.subtasks.map((s) => (
            <li key={s.id}>
              <label className={`subcheck ${s.done ? 'is-done' : ''}`}>
                <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(task.id, s.id)} />
                <span className="subcheck__box" aria-hidden="true">
                  <Icon name="check" size={13} />
                </span>
                <span className="subcheck__text">{s.title || 'Untitled'}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {(task.done || stamped) && (
        <span className="stamp" aria-hidden="true">
          DONE
        </span>
      )}
    </li>
  )
}
