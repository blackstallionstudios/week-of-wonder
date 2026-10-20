import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { uid } from '../lib/id'
import { isInkId, type InkId } from '../lib/inks'
import { archive, fileIntoBackIssues, rollover } from '../lib/rollover'
import { byOrder } from '../lib/tasks'
import type {
  PaneId,
  PaneView,
  PersistedState,
  Settings,
  SortMode,
  Subtask,
  Task,
  ThemePref,
  WeekStart,
} from '../lib/types'
import { weekKey } from '../lib/week'

export const STORAGE_KEY = 'week-of-wonder'
export const SCHEMA_VERSION = 1

export type LeftoverFate = 'carry' | 'someday' | 'let-go'

export interface Actions {
  addTask(pane: PaneId, title: string, ink?: InkId | null): string
  updateTask(id: string, patch: Partial<Pick<Task, 'title' | 'notes' | 'ink'>>): void
  toggleDone(id: string): void
  deleteTask(id: string): Task | undefined
  restoreTask(task: Task): void
  duplicateTask(id: string): string | undefined
  moveTask(id: string, pane: PaneId): void
  /** Reorder a pane given the new sequence of the (possibly filtered) visible ids. */
  reorderVisible(pane: PaneId, visibleIds: string[]): void

  addSubtask(taskId: string, title: string, afterId?: string): string
  updateSubtask(taskId: string, subId: string, title: string): void
  toggleSubtask(taskId: string, subId: string): void
  deleteSubtask(taskId: string, subId: string): void
  moveSubtask(taskId: string, from: number, to: number): void

  setSort(pane: PaneId, sort: SortMode): void
  toggleFilter(pane: PaneId, ink: InkId): void
  clearFilter(pane: PaneId): void
  setShowDone(pane: PaneId, show: boolean): void
  clearDone(pane: PaneId): number

  setTheme(theme: ThemePref): void
  setWeekStart(weekStart: WeekStart): void

  checkRollover(now?: number): void
  resolveLeftover(id: string, fate: LeftoverFate): void
  resolveAllLeftovers(ids: string[], fate: LeftoverFate): void

  /** Restore an archived ticket as a fresh, open Someday task. */
  reprint(weekKey: string, id: string): void

  exportData(): string
  importData(json: string): void
  reset(): void
}

export type Store = PersistedState & Actions

const defaultView = (): PaneView => ({ sort: 'manual', filter: [], showDone: false })

export function initialState(): PersistedState {
  return {
    tasks: [],
    view: { week: defaultView(), someday: defaultView() },
    settings: { theme: 'system', weekStart: 1 },
    lastIssueKey: null,
    backIssues: [],
  }
}

function currentKey(settings: Settings, now = Date.now()): string {
  return weekKey(now, settings.weekStart)
}

function topOrder(tasks: Task[], pane: PaneId): number {
  const orders = tasks.filter((t) => t.pane === pane).map((t) => t.order)
  return orders.length ? Math.min(...orders) - 1 : 0
}

function mapTask(tasks: Task[], id: string, fn: (t: Task) => Task): Task[] {
  return tasks.map((t) => (t.id === id ? fn(t) : t))
}

function mapSubtasks(tasks: Task[], taskId: string, fn: (subs: Subtask[]) => Subtask[]): Task[] {
  return mapTask(tasks, taskId, (t) => ({ ...t, subtasks: fn(t.subtasks) }))
}

/** Validates and normalizes untrusted data (imports, old storage). */
export function sanitize(raw: unknown): PersistedState {
  const base = initialState()
  if (!raw || typeof raw !== 'object') throw new Error('Not a Week of Wonder backup')
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.tasks)) throw new Error('Backup has no tasks list')
  const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  const task = (x: unknown, i: number): Task | null => {
    if (!x || typeof x !== 'object') return null
    const t = x as Record<string, unknown>
    const title = str(t.title).trim()
    if (!title) return null
    return {
      id: str(t.id) || uid(),
      pane: t.pane === 'week' ? 'week' : 'someday',
      title,
      notes: str(t.notes),
      ink: isInkId(t.ink) ? t.ink : null,
      subtasks: Array.isArray(t.subtasks)
        ? t.subtasks
            .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
            .map((s) => ({ id: str(s.id) || uid(), title: str(s.title), done: s.done === true }))
        : [],
      done: t.done === true,
      doneAt: typeof t.doneAt === 'number' ? t.doneAt : undefined,
      createdAt: num(t.createdAt, Date.now()),
      order: num(t.order, i),
      weekKey: typeof t.weekKey === 'string' ? t.weekKey : undefined,
    }
  }
  const tasks = r.tasks.map(task).filter((t): t is Task => t !== null)
  const s = (r.settings ?? {}) as Record<string, unknown>
  const settings: Settings = {
    theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
    weekStart: s.weekStart === 0 ? 0 : 1,
  }
  const v = (r.view ?? {}) as Record<string, Record<string, unknown> | undefined>
  const view = (p: PaneId): PaneView => ({
    sort: v[p]?.sort === 'ink' ? 'ink' : 'manual',
    filter: Array.isArray(v[p]?.filter) ? (v[p]!.filter as unknown[]).filter(isInkId) : [],
    showDone: v[p]?.showDone === true,
  })
  const backIssues = Array.isArray(r.backIssues)
    ? (r.backIssues as unknown[]).flatMap((b) => {
        if (!b || typeof b !== 'object') return []
        const bi = b as Record<string, unknown>
        if (typeof bi.weekKey !== 'string' || !Array.isArray(bi.items)) return []
        const items = bi.items.flatMap((it, i) => {
          const t = task(it, i)
          if (!t) return []
          const o = it as Record<string, unknown>
          return [{ ...t, fate: o.fate === 'let-go' ? ('let-go' as const) : ('done' as const), archivedAt: num(o.archivedAt, Date.now()) }]
        })
        return [{ weekKey: bi.weekKey, items }]
      })
    : base.backIssues
  return {
    tasks,
    view: { week: view('week'), someday: view('someday') },
    settings,
    lastIssueKey: typeof r.lastIssueKey === 'string' ? r.lastIssueKey : null,
    backIssues,
  }
}

function pickPersisted(s: PersistedState): PersistedState {
  return {
    tasks: s.tasks,
    view: s.view,
    settings: s.settings,
    lastIssueKey: s.lastIssueKey,
    backIssues: s.backIssues,
  }
}

export const useStore = create<Store>()(
  persist<Store, [], [], PersistedState>(
    (set, get) => ({
      ...initialState(),

      addTask(pane, title, ink = null) {
        const id = uid()
        const now = Date.now()
        set((s) => ({
          tasks: [
            ...s.tasks,
            {
              id,
              pane,
              title: title.trim(),
              notes: '',
              ink,
              subtasks: [],
              done: false,
              createdAt: now,
              order: topOrder(s.tasks, pane),
              weekKey: pane === 'week' ? currentKey(s.settings, now) : undefined,
            },
          ],
        }))
        return id
      },

      updateTask(id, patch) {
        set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, ...patch })) }))
      },

      toggleDone(id) {
        set((s) => ({
          tasks: mapTask(s.tasks, id, (t) =>
            t.done ? { ...t, done: false, doneAt: undefined } : { ...t, done: true, doneAt: Date.now() },
          ),
        }))
      },

      deleteTask(id) {
        const task = get().tasks.find((t) => t.id === id)
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
        return task
      },

      restoreTask(task) {
        set((s) => (s.tasks.some((t) => t.id === task.id) ? s : { tasks: [...s.tasks, task] }))
      },

      duplicateTask(id) {
        const src = get().tasks.find((t) => t.id === id)
        if (!src) return undefined
        const copy: Task = {
          ...src,
          id: uid(),
          title: src.title,
          done: false,
          doneAt: undefined,
          createdAt: Date.now(),
          order: src.order - 0.5,
          subtasks: src.subtasks.map((st) => ({ ...st, id: uid(), done: false })),
        }
        set((s) => ({ tasks: [...s.tasks, copy] }))
        return copy.id
      },

      moveTask(id, pane) {
        set((s) => ({
          tasks: mapTask(s.tasks, id, (t) =>
            t.pane === pane
              ? t
              : {
                  ...t,
                  pane,
                  order: topOrder(s.tasks, pane),
                  weekKey: pane === 'week' ? currentKey(s.settings) : undefined,
                },
          ),
        }))
      },

      reorderVisible(pane, visibleIds) {
        set((s) => {
          const full = s.tasks.filter((t) => t.pane === pane).sort(byOrder)
          const visible = new Set(visibleIds)
          const queue = visibleIds.slice()
          // Visible tasks take over the slots previously occupied by visible
          // tasks; hidden (filtered/done) tasks keep their positions.
          const sequence = full.map((t) => (visible.has(t.id) ? queue.shift()! : t.id))
          const orderOf = new Map(sequence.map((id, i) => [id, i]))
          return {
            tasks: s.tasks.map((t) => (t.pane === pane && orderOf.has(t.id) ? { ...t, order: orderOf.get(t.id)! } : t)),
          }
        })
      },

      addSubtask(taskId, title, afterId) {
        const id = uid()
        set((s) => ({
          tasks: mapSubtasks(s.tasks, taskId, (subs) => {
            const next = subs.slice()
            const at = afterId ? subs.findIndex((x) => x.id === afterId) + 1 : subs.length
            next.splice(at > 0 ? at : subs.length, 0, { id, title, done: false })
            return next
          }),
        }))
        return id
      },

      updateSubtask(taskId, subId, title) {
        set((s) => ({ tasks: mapSubtasks(s.tasks, taskId, (subs) => subs.map((x) => (x.id === subId ? { ...x, title } : x))) }))
      },

      toggleSubtask(taskId, subId) {
        set((s) => ({
          tasks: mapSubtasks(s.tasks, taskId, (subs) => subs.map((x) => (x.id === subId ? { ...x, done: !x.done } : x))),
        }))
      },

      deleteSubtask(taskId, subId) {
        set((s) => ({ tasks: mapSubtasks(s.tasks, taskId, (subs) => subs.filter((x) => x.id !== subId)) }))
      },

      moveSubtask(taskId, from, to) {
        set((s) => ({
          tasks: mapSubtasks(s.tasks, taskId, (subs) => {
            if (to < 0 || to >= subs.length) return subs
            const next = subs.slice()
            const [x] = next.splice(from, 1)
            next.splice(to, 0, x)
            return next
          }),
        }))
      },

      setSort(pane, sort) {
        set((s) => ({ view: { ...s.view, [pane]: { ...s.view[pane], sort } } }))
      },

      toggleFilter(pane, ink) {
        set((s) => {
          const f = s.view[pane].filter
          const filter = f.includes(ink) ? f.filter((x) => x !== ink) : [...f, ink]
          return { view: { ...s.view, [pane]: { ...s.view[pane], filter } } }
        })
      },

      clearFilter(pane) {
        set((s) => ({ view: { ...s.view, [pane]: { ...s.view[pane], filter: [] } } }))
      },

      setShowDone(pane, showDone) {
        set((s) => ({ view: { ...s.view, [pane]: { ...s.view[pane], showDone } } }))
      },

      clearDone(pane) {
        const now = Date.now()
        const { tasks, settings } = get()
        const cleared = tasks.filter((t) => t.pane === pane && t.done)
        const byWeek = new Map<string, ReturnType<typeof archive>[]>()
        for (const t of cleared) {
          const key = weekKey(t.doneAt ?? now, settings.weekStart)
          byWeek.set(key, [...(byWeek.get(key) ?? []), archive(t, 'done', now)])
        }
        set((s) => ({
          tasks: s.tasks.filter((t) => !(t.pane === pane && t.done)),
          backIssues: fileIntoBackIssues(s.backIssues, byWeek),
        }))
        return cleared.length
      },

      setTheme(theme) {
        set((s) => ({ settings: { ...s.settings, theme } }))
      },

      setWeekStart(weekStart) {
        set((s) => {
          if (s.settings.weekStart === weekStart) return s
          const now = Date.now()
          const oldKey = weekKey(now, s.settings.weekStart)
          const newKey = weekKey(now, weekStart)
          // Re-stamp this week's tasks so changing the setting never
          // manufactures "leftovers".
          return {
            settings: { ...s.settings, weekStart },
            lastIssueKey: s.lastIssueKey === oldKey ? newKey : s.lastIssueKey,
            tasks: s.tasks.map((t) => (t.weekKey === oldKey ? { ...t, weekKey: newKey } : t)),
          }
        })
      },

      checkRollover(now = Date.now()) {
        const s = get()
        const next = rollover(pickPersisted(s), now)
        if (next.lastIssueKey !== s.lastIssueKey) set(next)
      },

      resolveLeftover(id, fate) {
        get().resolveAllLeftovers([id], fate)
      },

      resolveAllLeftovers(ids, fate) {
        const now = Date.now()
        set((s) => {
          const key = currentKey(s.settings, now)
          const targets = new Set(ids)
          if (fate === 'let-go') {
            const byWeek = new Map<string, ReturnType<typeof archive>[]>()
            for (const t of s.tasks) {
              if (!targets.has(t.id)) continue
              const wk = t.weekKey ?? key
              byWeek.set(wk, [...(byWeek.get(wk) ?? []), archive(t, 'let-go', now)])
            }
            return {
              tasks: s.tasks.filter((t) => !targets.has(t.id)),
              backIssues: fileIntoBackIssues(s.backIssues, byWeek),
            }
          }
          let top = topOrder(s.tasks, 'someday')
          return {
            tasks: s.tasks.map((t) => {
              if (!targets.has(t.id)) return t
              if (fate === 'carry') return { ...t, weekKey: key }
              return { ...t, pane: 'someday' as const, weekKey: undefined, order: top-- }
            }),
          }
        })
      },

      reprint(key, id) {
        set((s) => {
          const issue = s.backIssues.find((b) => b.weekKey === key)
          const item = issue?.items.find((i) => i.id === id)
          if (!issue || !item) return s
          const task: Task = {
            id: uid(),
            pane: 'someday',
            title: item.title,
            notes: item.notes,
            ink: item.ink,
            subtasks: item.subtasks.map((st) => ({ ...st, done: false })),
            done: false,
            createdAt: Date.now(),
            order: topOrder(s.tasks, 'someday'),
          }
          return {
            tasks: [...s.tasks, task],
            backIssues: s.backIssues
              .map((b) => (b.weekKey === key ? { ...b, items: b.items.filter((i) => i !== item) } : b))
              .filter((b) => b.items.length > 0),
          }
        })
      },

      exportData() {
        const data = { app: 'week-of-wonder', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), ...pickPersisted(get()) }
        return JSON.stringify(data, null, 2)
      },

      importData(json) {
        let parsed: unknown
        try {
          parsed = JSON.parse(json)
        } catch {
          throw new Error('That file is not valid JSON')
        }
        set(sanitize(parsed))
        get().checkRollover()
      },

      reset() {
        set(initialState())
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: pickPersisted,
      migrate: (persisted) => {
        try {
          return sanitize(persisted)
        } catch {
          return initialState()
        }
      },
    },
  ),
)
