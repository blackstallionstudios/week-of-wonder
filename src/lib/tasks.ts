import { inkRank, type InkId } from './inks'
import type { PaneId, PaneView, Task } from './types'

export function byOrder(a: Task, b: Task): number {
  return a.order - b.order || a.createdAt - b.createdAt
}

export function byInk(a: Task, b: Task): number {
  return inkRank(a.ink) - inkRank(b.ink) || byOrder(a, b)
}

export function paneTasks(tasks: Task[], pane: PaneId): Task[] {
  return tasks.filter((t) => t.pane === pane)
}

export interface PaneListing {
  open: Task[]
  done: Task[]
  /** Open tasks hidden by the ink filter. */
  hiddenByFilter: number
}

/** Split a pane into open and done lists, applying the view's ink filter and sort mode. */
export function listPane(tasks: Task[], pane: PaneId, view: PaneView): PaneListing {
  const all = paneTasks(tasks, pane)
  const matches = (t: Task) => view.filter.length === 0 || (t.ink !== null && view.filter.includes(t.ink))
  const cmp = view.sort === 'ink' ? byInk : byOrder
  const openAll = all.filter((t) => !t.done)
  const open = openAll.filter(matches).sort(cmp)
  const done = all
    .filter((t) => t.done && matches(t))
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
  return { open, done, hiddenByFilter: openAll.length - open.length }
}

export interface InkGroup {
  ink: InkId | null
  tasks: Task[]
}

/** Group an already ink-sorted list into consecutive runs of the same ink. */
export function groupByInk(sorted: Task[]): InkGroup[] {
  const groups: InkGroup[] = []
  for (const t of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.ink === t.ink) last.tasks.push(t)
    else groups.push({ ink: t.ink, tasks: [t] })
  }
  return groups
}

export function subtaskProgress(t: Task): { done: number; total: number } {
  return { done: t.subtasks.filter((s) => s.done).length, total: t.subtasks.length }
}

export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
