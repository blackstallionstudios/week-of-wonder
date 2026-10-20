import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Minimal localStorage for the persist middleware in a node environment.
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
})

const { useStore, sanitize, initialState } = await import('./useStore')
const { leftovers } = await import('../lib/rollover')
const { listPane, groupByInk } = await import('../lib/tasks')

const s = () => useStore.getState()
const TUE = new Date(2026, 9, 20, 10) // Tue Oct 20 2026
const NEXT_TUE = new Date(2026, 9, 27, 10)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TUE)
  s().reset()
  s().checkRollover()
})
afterEach(() => vi.useRealTimers())

describe('tasks', () => {
  it('adds tasks to the top of a pane and stamps week tasks', () => {
    const a = s().addTask('week', '  Buy stamps ', 'pink')
    const b = s().addTask('week', 'Call mum')
    const c = s().addTask('someday', 'Learn the banjo')
    const { open } = listPane(s().tasks, 'week', s().view.week)
    expect(open.map((t) => t.id)).toEqual([b, a])
    expect(s().tasks.find((t) => t.id === a)).toMatchObject({ title: 'Buy stamps', ink: 'pink', weekKey: '2026-10-19' })
    expect(s().tasks.find((t) => t.id === c)?.weekKey).toBeUndefined()
  })

  it('moves between panes, re-stamping the week', () => {
    const id = s().addTask('someday', 'Paint the door')
    s().moveTask(id, 'week')
    expect(s().tasks[0]).toMatchObject({ pane: 'week', weekKey: '2026-10-19' })
    s().moveTask(id, 'someday')
    expect(s().tasks[0]).toMatchObject({ pane: 'someday', weekKey: undefined })
  })

  it('toggles done and supports delete + undo', () => {
    const id = s().addTask('week', 'Water plants')
    s().toggleDone(id)
    expect(s().tasks[0].done).toBe(true)
    expect(s().tasks[0].doneAt).toBe(TUE.getTime())
    const removed = s().deleteTask(id)!
    expect(s().tasks).toHaveLength(0)
    s().restoreTask(removed)
    s().restoreTask(removed)
    expect(s().tasks).toHaveLength(1)
  })

  it('duplicates with fresh ids and unchecked subtasks', () => {
    const id = s().addTask('week', 'Pack')
    s().addSubtask(id, 'Socks')
    s().toggleSubtask(id, s().tasks[0].subtasks[0].id)
    const copy = s().duplicateTask(id)!
    const t = s().tasks.find((x) => x.id === copy)!
    expect(t.subtasks[0]).toMatchObject({ title: 'Socks', done: false })
    expect(t.subtasks[0].id).not.toBe(s().tasks[0].subtasks[0].id)
  })

  it('reorders only the visible tasks, leaving filtered ones in place', () => {
    const a = s().addTask('week', 'A', 'pink')
    const b = s().addTask('week', 'B', 'teal')
    const c = s().addTask('week', 'C', 'pink')
    // manual order is C, B, A. Filter pink → C, A; swap them.
    s().toggleFilter('week', 'pink')
    expect(listPane(s().tasks, 'week', s().view.week).open.map((t) => t.id)).toEqual([c, a])
    s().reorderVisible('week', [a, c])
    s().clearFilter('week')
    expect(listPane(s().tasks, 'week', s().view.week).open.map((t) => t.id)).toEqual([a, b, c])
  })
})

describe('subtasks', () => {
  it('adds after a given subtask, edits, moves and deletes', () => {
    const id = s().addTask('someday', 'Trip')
    const x = s().addSubtask(id, 'x')
    const z = s().addSubtask(id, 'z')
    const y = s().addSubtask(id, 'y', x)
    expect(s().tasks[0].subtasks.map((st) => st.id)).toEqual([x, y, z])
    s().updateSubtask(id, y, 'why')
    s().moveSubtask(id, 2, 0)
    expect(s().tasks[0].subtasks.map((st) => st.title)).toEqual(['z', 'x', 'why'])
    s().moveSubtask(id, 0, -1) // out of range: no-op
    s().deleteSubtask(id, x)
    expect(s().tasks[0].subtasks.map((st) => st.title)).toEqual(['z', 'why'])
  })
})

describe('sort by ink', () => {
  it('sorts in spectrum order with plain last, and groups runs', () => {
    s().addTask('someday', 'plain')
    s().addTask('someday', 'violet', 'violet')
    s().addTask('someday', 'pink', 'pink')
    s().addTask('someday', 'sun', 'sunflower')
    s().addTask('someday', 'pink 2', 'pink')
    s().setSort('someday', 'ink')
    const { open } = listPane(s().tasks, 'someday', s().view.someday)
    expect(open.map((t) => t.title)).toEqual(['pink 2', 'pink', 'sun', 'violet', 'plain'])
    expect(groupByInk(open).map((g) => [g.ink, g.tasks.length])).toEqual([
      ['pink', 2],
      ['sunflower', 1],
      ['violet', 1],
      [null, 1],
    ])
  })

  it('separates done tasks, newest first', () => {
    const a = s().addTask('week', 'a')
    const b = s().addTask('week', 'b')
    s().toggleDone(a)
    vi.setSystemTime(TUE.getTime() + 1000)
    s().toggleDone(b)
    const { open, done } = listPane(s().tasks, 'week', s().view.week)
    expect(open).toHaveLength(0)
    expect(done.map((t) => t.id)).toEqual([b, a])
  })
})

describe('rollover', () => {
  it('archives done tasks and leaves unfinished week tasks as leftovers', () => {
    const done = s().addTask('week', 'done thing')
    const open = s().addTask('week', 'open thing')
    const someDone = s().addTask('someday', 'someday done')
    const someOpen = s().addTask('someday', 'someday open')
    s().toggleDone(done)
    s().toggleDone(someDone)

    vi.setSystemTime(NEXT_TUE)
    s().checkRollover()
    expect(s().lastIssueKey).toBe('2026-10-26')
    expect(s().tasks.map((t) => t.id).sort()).toEqual([open, someOpen].sort())
    expect(s().backIssues).toHaveLength(1)
    expect(s().backIssues[0].weekKey).toBe('2026-10-19')
    expect(s().backIssues[0].items.map((i) => i.fate)).toEqual(['done', 'done'])
    expect(leftovers(s().tasks, '2026-10-26').map((t) => t.id)).toEqual([open])
  })

  it('handles several skipped weeks in one ritual', () => {
    s().addTask('week', 'ancient')
    vi.setSystemTime(new Date(2026, 10, 18)) // ~4 weeks later
    s().checkRollover()
    expect(s().lastIssueKey).toBe('2026-11-16')
    expect(leftovers(s().tasks, '2026-11-16')).toHaveLength(1)
  })

  it('resolves leftovers: carry, send to someday, let go', () => {
    const a = s().addTask('week', 'carry me')
    const b = s().addTask('week', 'someday me')
    const c = s().addTask('week', 'let me go')
    vi.setSystemTime(NEXT_TUE)
    s().checkRollover()
    s().resolveLeftover(a, 'carry')
    s().resolveLeftover(b, 'someday')
    s().resolveLeftover(c, 'let-go')
    expect(leftovers(s().tasks, '2026-10-26')).toHaveLength(0)
    expect(s().tasks.find((t) => t.id === a)).toMatchObject({ pane: 'week', weekKey: '2026-10-26' })
    expect(s().tasks.find((t) => t.id === b)).toMatchObject({ pane: 'someday', weekKey: undefined })
    expect(s().tasks.find((t) => t.id === c)).toBeUndefined()
    expect(s().backIssues[0].items[0]).toMatchObject({ title: 'let me go', fate: 'let-go' })
  })

  it('does not invent leftovers when the week-start setting changes', () => {
    s().addTask('week', 'steady')
    s().setWeekStart(0)
    s().checkRollover()
    expect(leftovers(s().tasks, s().lastIssueKey!)).toHaveLength(0)
    expect(s().lastIssueKey).toBe('2026-10-18')
  })

  it('clearDone files done tasks into back issues', () => {
    const id = s().addTask('someday', 'x')
    s().toggleDone(id)
    expect(s().clearDone('someday')).toBe(1)
    expect(s().tasks).toHaveLength(0)
    expect(s().backIssues[0].items[0].title).toBe('x')
  })
})

describe('import / export', () => {
  it('round-trips', () => {
    const id = s().addTask('week', 'Round trip', 'teal')
    s().addSubtask(id, 'sub')
    s().updateTask(id, { notes: 'hello' })
    const json = s().exportData()
    s().reset()
    s().importData(json)
    expect(s().tasks[0]).toMatchObject({ title: 'Round trip', ink: 'teal', notes: 'hello' })
    expect(s().tasks[0].subtasks[0].title).toBe('sub')
  })

  it('rejects garbage and cleans up sloppy data', () => {
    expect(() => s().importData('nope')).toThrow(/JSON/)
    expect(() => sanitize({})).toThrow()
    const clean = sanitize({
      tasks: [{ title: 'ok', ink: 'chartreuse', pane: 'mars', subtasks: [null, { title: 's' }] }, { title: '' }, 7],
      settings: { theme: 'neon', weekStart: 0 },
    })
    expect(clean.tasks).toHaveLength(1)
    expect(clean.tasks[0]).toMatchObject({ ink: null, pane: 'someday' })
    expect(clean.tasks[0].subtasks).toHaveLength(1)
    expect(clean.settings).toEqual({ theme: 'system', weekStart: 0 })
    expect(clean.view).toEqual(initialState().view)
  })
})

describe('back issues', () => {
  it('reprints an archived ticket into Someday', () => {
    const id = s().addTask('week', 'Old news', 'violet')
    s().addSubtask(id, 'part')
    s().toggleSubtask(id, s().tasks[0].subtasks[0].id)
    s().toggleDone(id)
    vi.setSystemTime(NEXT_TUE)
    s().checkRollover()
    expect(s().tasks).toHaveLength(0)
    s().reprint('2026-10-19', id)
    expect(s().backIssues).toHaveLength(0)
    expect(s().tasks[0]).toMatchObject({ title: 'Old news', pane: 'someday', done: false, ink: 'violet' })
    expect(s().tasks[0].subtasks[0].done).toBe(false)
  })
})
