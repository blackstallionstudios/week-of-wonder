import { create } from 'zustand'
import type { PaneId } from '../lib/types'

export type Sheet =
  | { kind: 'task'; id: string }
  | { kind: 'add' }
  | { kind: 'menu' }
  | { kind: 'back' }
  | null

export interface Toast {
  id: number
  message: string
  action?: { label: string; run: () => void }
  tone?: 'plain' | 'ink'
}

interface UIState {
  now: number
  activePane: PaneId
  sheet: Sheet
  toasts: Toast[]
  /** Task id that was just completed (drives the stamp animation). */
  stamped: string | null
  setNow(now: number): void
  setActivePane(pane: PaneId): void
  open(sheet: Sheet): void
  close(): void
  toast(t: Omit<Toast, 'id'>, ms?: number): void
  dismissToast(id: number): void
  stamp(id: string | null): void
}

let toastSeq = 0

export const useUI = create<UIState>()((set, get) => ({
  now: Date.now(),
  activePane: 'week',
  sheet: null,
  toasts: [],
  stamped: null,
  setNow: (now) => set({ now }),
  setActivePane: (activePane) => set({ activePane }),
  open: (sheet) => set({ sheet }),
  close: () => set({ sheet: null }),
  toast(t, ms = 5000) {
    const id = ++toastSeq
    // One toast at a time reads best on a phone; newer replaces older.
    set({ toasts: [{ ...t, id }] })
    window.setTimeout(() => get().dismissToast(id), ms)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  stamp: (stamped) => set({ stamped }),
}))
