import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { inkVar, type InkId } from '../lib/inks'
import type { PaneId } from '../lib/types'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { Icon } from './Icon'
import { InkPicker } from './InkPicker'
import { Sheet } from './Sheet'

export function QuickAdd() {
  const isOpen = useUI((s) => s.sheet?.kind === 'add')
  const close = useUI((s) => s.close)
  return (
    <Sheet open={isOpen} onClose={close} label="Add a task" className="sheet--add">
      {isOpen && <QuickAddForm onDone={close} />}
    </Sheet>
  )
}

function QuickAddForm({ onDone }: { onDone(): void }) {
  const activePane = useUI((s) => s.activePane)
  const addTask = useStore((s) => s.addTask)
  const [pane, setPane] = useState<PaneId>(activePane)
  const [title, setTitle] = useState('')
  const [ink, setInk] = useState<InkId | null>(null)
  const [added, setAdded] = useState<{ id: string; title: string; ink: InkId | null; pane: PaneId }[]>([])
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Wait a frame so iOS treats this as part of the opening gesture.
    const f = requestAnimationFrame(() => input.current?.focus())
    return () => cancelAnimationFrame(f)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) {
      if (added.length) onDone()
      return
    }
    const id = addTask(pane, t, ink)
    setAdded((a) => [{ id, title: t, ink, pane }, ...a].slice(0, 5))
    setTitle('')
    input.current?.focus()
  }

  return (
    <form className="quickadd" onSubmit={submit}>
      <div className="sheet__head">
        <h2 className="sheet__title">Set a ticket</h2>
        <div className="seg seg--panes" role="radiogroup" aria-label="Add to">
          {(['week', 'someday'] as const).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={pane === p} className={`seg__${p}`} onClick={() => setPane(p)}>
              {p === 'week' ? 'This Week' : 'Someday'}
            </button>
          ))}
        </div>
      </div>

      <div className="quickadd__row" style={{ '--ink': inkVar(ink) } as CSSProperties}>
        <span className="quickadd__stub" aria-hidden="true" />
        <input
          ref={input}
          className="quickadd__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={pane === 'week' ? 'What needs doing this week?' : 'What would be wonderful, someday?'}
          aria-label="Task title"
          enterKeyHint="done"
          autoComplete="off"
          maxLength={200}
        />
        <button type="submit" className="btn btn--ink quickadd__go" aria-label="Add task" disabled={!title.trim()}>
          <Icon name="plus" size={22} />
        </button>
      </div>

      <InkPicker value={ink} onChange={setInk} label="Ink for new task" compact />

      {added.length > 0 && (
        <ul className="quickadd__added" aria-label="Just added">
          {added.map((a) => (
            <li key={a.id} style={{ '--ink': inkVar(a.ink) } as CSSProperties}>
              <Icon name="check" size={14} /> {a.title}
              <span className="quickadd__where">{a.pane === 'week' ? 'this week' : 'someday'}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="hint">Press enter to keep adding. Tap a ticket later for subtasks &amp; notes.</p>
    </form>
  )
}
