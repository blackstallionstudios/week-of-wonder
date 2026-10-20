import type { WeekStart } from './types'

/**
 * All week math works in *local* calendar days. Days are stepped with
 * setDate() rather than millisecond arithmetic so DST shifts are harmless.
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfWeek(now: Date | number, weekStart: WeekStart): Date {
  const d = startOfDay(new Date(now))
  const diff = (d.getDay() - weekStart + 7) % 7
  return addDays(d, -diff)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Week identity: local date (YYYY-MM-DD) of the first day of the week. */
export function weekKey(now: Date | number, weekStart: WeekStart): string {
  return dateKey(startOfWeek(now, weekStart))
}

/** ISO-8601 week number of a date. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Display "issue number": ISO week of the week's midpoint. */
export function issueNumber(key: string): number {
  return isoWeek(addDays(parseKey(key), 3))
}

export function weekDays(key: string): Date[] {
  const start = parseKey(key)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Fraction (0..1) of the week that has elapsed at `now`. */
export function weekProgress(now: Date | number, weekStart: WeekStart): number {
  const start = startOfWeek(now, weekStart)
  const end = addDays(start, 7)
  const t = new Date(now).getTime()
  return Math.min(1, Math.max(0, (t - start.getTime()) / (end.getTime() - start.getTime())))
}

/** "OCT 19–25" or "SEP 28–OCT 4". */
export function formatWeekRange(key: string): string {
  const start = parseKey(key)
  const end = addDays(start, 6)
  const a = `${MONTHS[start.getMonth()]} ${start.getDate()}`
  const b = start.getMonth() === end.getMonth() ? `${end.getDate()}` : `${MONTHS[end.getMonth()]} ${end.getDate()}`
  return `${a}–${b}`
}

/** Days remaining in the week including today (7 on the first day, 1 on the last). */
export function daysLeft(now: Date | number, weekStart: WeekStart): number {
  const start = startOfWeek(now, weekStart)
  const today = startOfDay(new Date(now))
  let i = 0
  while (dateKey(addDays(start, i)) !== dateKey(today) && i < 7) i++
  return 7 - i
}
