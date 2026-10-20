import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import type { PaneId } from './types'

/** Higher-level actions that combine store changes with UI feedback. */

export function completeTask(id: string): void {
  const task = useStore.getState().tasks.find((t) => t.id === id)
  if (!task) return
  useStore.getState().toggleDone(id)
  if (!task.done) {
    useUI.getState().stamp(id)
    navigator.vibrate?.(12)
  }
}

export function deleteWithUndo(id: string): void {
  const removed = useStore.getState().deleteTask(id)
  if (!removed) return
  if (useUI.getState().sheet?.kind === 'task') useUI.getState().close()
  useUI.getState().toast({
    message: `Shredded “${truncate(removed.title, 28)}”`,
    action: { label: 'Undo', run: () => useStore.getState().restoreTask(removed) },
  })
}

export function moveWithToast(id: string, pane: PaneId): void {
  useStore.getState().moveTask(id, pane)
  useUI.getState().toast({
    message: pane === 'week' ? 'Pulled into This Week' : 'Filed under Someday',
    tone: 'ink',
    action: {
      label: 'Go',
      run: () => document.getElementById(`pane-${pane}`)?.scrollIntoView({ behavior: 'smooth', inline: 'start' }),
    },
  })
}

export function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

const URL_RE = /\bhttps?:\/\/[^\s<>"')]+[^\s<>"').,;:!?]/gi

export function findLinks(text: string): string[] {
  return [...new Set(text.match(URL_RE) ?? [])]
}

export function prettyHost(url: string): string {
  try {
    const u = new URL(url)
    return (u.host.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '')).slice(0, 40)
  } catch {
    return url
  }
}
