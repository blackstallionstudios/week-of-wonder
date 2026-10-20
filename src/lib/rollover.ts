import type { ArchivedTask, BackIssue, PersistedState, Task } from './types'
import { startOfWeek, weekKey } from './week'

export const MAX_BACK_ISSUES = 104

export function archive(task: Task, fate: ArchivedTask['fate'], now: number): ArchivedTask {
  return { ...task, fate, archivedAt: now }
}

/** Merge archived items into back issues (newest week first), keyed by week. */
export function fileIntoBackIssues(backIssues: BackIssue[], byWeek: Map<string, ArchivedTask[]>): BackIssue[] {
  if (byWeek.size === 0) return backIssues
  const map = new Map(backIssues.map((b) => [b.weekKey, b.items.slice()]))
  for (const [key, items] of byWeek) map.set(key, [...(map.get(key) ?? []), ...items])
  return [...map.entries()]
    .map(([weekKey, items]) => ({ weekKey, items }))
    .sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1))
    .slice(0, MAX_BACK_ISSUES)
}

/**
 * Called on open and whenever the app regains focus. When the week has turned
 * (by one week or many), done tasks from earlier weeks — in either pane — are
 * filed into Back Issues. Unfinished week tasks are left alone with their old
 * weekKey: they become "leftovers" that the New Issue ritual resolves.
 */
export function rollover(state: PersistedState, now: number): PersistedState {
  const current = weekKey(now, state.settings.weekStart)
  if (state.lastIssueKey === current) return state
  if (state.lastIssueKey === null) return { ...state, lastIssueKey: current }

  const cutoff = startOfWeek(now, state.settings.weekStart).getTime()
  const byWeek = new Map<string, ArchivedTask[]>()
  const keep: Task[] = []
  for (const t of state.tasks) {
    if (t.done && (t.doneAt ?? 0) < cutoff) {
      const key = weekKey(t.doneAt ?? now, state.settings.weekStart)
      byWeek.set(key, [...(byWeek.get(key) ?? []), archive(t, 'done', now)])
    } else {
      keep.push(t)
    }
  }
  return {
    ...state,
    tasks: keep,
    backIssues: fileIntoBackIssues(state.backIssues, byWeek),
    lastIssueKey: current,
  }
}

/** Unfinished This Week tasks that belong to a previous issue. */
export function leftovers(tasks: Task[], currentKey: string): Task[] {
  return tasks.filter((t) => t.pane === 'week' && !t.done && t.weekKey !== currentKey)
}
