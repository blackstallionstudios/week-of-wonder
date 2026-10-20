import type { InkId } from './inks'

export type PaneId = 'week' | 'someday'
export type SortMode = 'manual' | 'ink'
export type ThemePref = 'system' | 'light' | 'dark'
export type WeekStart = 0 | 1 // 0 = Sunday, 1 = Monday

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  pane: PaneId
  title: string
  notes: string
  ink: InkId | null
  subtasks: Subtask[]
  done: boolean
  doneAt?: number
  createdAt: number
  /** Manual sort position within its pane (ascending). */
  order: number
  /** For week-pane tasks: the weekKey of the issue the task belongs to. */
  weekKey?: string
}

export type Fate = 'done' | 'let-go'

export interface ArchivedTask extends Task {
  fate: Fate
  archivedAt: number
}

export interface BackIssue {
  weekKey: string
  items: ArchivedTask[]
}

export interface PaneView {
  sort: SortMode
  filter: InkId[]
  showDone: boolean
}

export interface Settings {
  theme: ThemePref
  weekStart: WeekStart
}

export interface PersistedState {
  tasks: Task[]
  view: Record<PaneId, PaneView>
  settings: Settings
  lastIssueKey: string | null
  backIssues: BackIssue[]
}
