import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, type KeyboardEvent } from 'react'
import type { Subtask, Task } from '../lib/types'
import { useStore } from '../store/useStore'
import { Icon } from './Icon'

/** Focus a subtask input once React has rendered it. */
function focusSubtask(id: string) {
  requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-sub-input="${id}"]`)?.focus())
}

export function SubtaskList({ task }: { task: Task }) {
  const { addSubtask, moveSubtask } = useStore.getState()
  const [draft, setDraft] = useState('')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const ids = task.subtasks.map((s) => s.id)
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    moveSubtask(task.id, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
  }
  const done = task.subtasks.filter((s) => s.done).length

  return (
    <section className="subtasks" aria-labelledby="subtasks-title">
      <h3 className="section-label" id="subtasks-title">
        Steps
        {task.subtasks.length > 0 && (
          <span className="section-label__meta">
            {done}/{task.subtasks.length}
          </span>
        )}
      </h3>
      {task.subtasks.length > 0 && (
        <div className="subtasks__meter" aria-hidden="true">
          <span style={{ width: `${(done / task.subtasks.length) * 100}%` }} />
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="subtasks__list">
            {task.subtasks.map((s, i) => (
              <SubtaskRow
                key={s.id}
                taskId={task.id}
                sub={s}
                onEnter={() => focusSubtask(addSubtask(task.id, '', s.id))}
                onEmptyBackspace={() => {
                  useStore.getState().deleteSubtask(task.id, s.id)
                  focusSubtask(task.subtasks[i - 1]?.id ?? 'new')
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <form
        className="subtasks__new"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.trim()) return
          addSubtask(task.id, draft.trim())
          setDraft('')
        }}
      >
        <span className="subtasks__plus" aria-hidden="true">
          <Icon name="plus" size={16} />
        </span>
        <input
          data-sub-input="new"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a step"
          aria-label="New subtask"
          enterKeyHint="enter"
          autoComplete="off"
          maxLength={200}
        />
      </form>
    </section>
  )
}

function SubtaskRow({
  taskId,
  sub,
  onEnter,
  onEmptyBackspace,
}: {
  taskId: string
  sub: Subtask
  onEnter(): void
  onEmptyBackspace(): void
}) {
  const { updateSubtask, toggleSubtask, deleteSubtask } = useStore.getState()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id })

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEnter()
    } else if (e.key === 'Backspace' && sub.title === '') {
      e.preventDefault()
      onEmptyBackspace()
    }
  }

  return (
    <li
      ref={setNodeRef}
      className={`subrow ${sub.done ? 'is-done' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-testid="subtask"
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="subrow__grip"
        aria-label={`Reorder ${sub.title || 'step'}`}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={18} />
      </button>
      <label className={`subcheck ${sub.done ? 'is-done' : ''}`}>
        <input type="checkbox" checked={sub.done} onChange={() => toggleSubtask(taskId, sub.id)} aria-label={`Done: ${sub.title || 'step'}`} />
        <span className="subcheck__box" aria-hidden="true">
          <Icon name="check" size={13} />
        </span>
      </label>
      <input
        className="subrow__input"
        data-sub-input={sub.id}
        value={sub.title}
        onChange={(e) => updateSubtask(taskId, sub.id, e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (!sub.title.trim()) deleteSubtask(taskId, sub.id)
        }}
        placeholder="Step"
        aria-label="Subtask"
        enterKeyHint="next"
        autoComplete="off"
        maxLength={200}
      />
      <button type="button" className="subrow__del" aria-label={`Delete ${sub.title || 'step'}`} onClick={() => deleteSubtask(taskId, sub.id)}>
        <Icon name="close" size={16} />
      </button>
    </li>
  )
}
