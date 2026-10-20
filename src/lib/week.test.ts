import { describe, expect, it } from 'vitest'
import { daysLeft, formatWeekRange, issueNumber, isoWeek, startOfWeek, weekDays, weekKey, weekProgress } from './week'

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h)

describe('weekKey', () => {
  it('uses the Monday of the week by default', () => {
    expect(weekKey(d(2026, 10, 20), 1)).toBe('2026-10-19') // Tue → Mon
    expect(weekKey(d(2026, 10, 19, 0), 1)).toBe('2026-10-19') // Mon 00:00
    expect(weekKey(d(2026, 10, 25, 23), 1)).toBe('2026-10-19') // Sun night
    expect(weekKey(d(2026, 10, 26, 0), 1)).toBe('2026-10-26') // next Mon
  })

  it('supports Sunday-start weeks', () => {
    expect(weekKey(d(2026, 10, 20), 0)).toBe('2026-10-18')
    expect(weekKey(d(2026, 10, 25), 0)).toBe('2026-10-25') // Sunday starts a new week
    expect(weekKey(d(2026, 10, 24), 0)).toBe('2026-10-18')
  })

  it('crosses year boundaries', () => {
    expect(weekKey(d(2027, 1, 1), 1)).toBe('2026-12-28')
    expect(weekKey(d(2027, 1, 1), 0)).toBe('2026-12-27')
  })

  it('is stable across DST changes', () => {
    // US/EU DST transitions happen in March and October/November.
    expect(weekKey(d(2026, 11, 2), 1)).toBe('2026-11-02')
    expect(weekKey(d(2026, 11, 8, 23), 1)).toBe('2026-11-02')
    expect(weekKey(d(2026, 3, 29, 23), 1)).toBe('2026-03-23')
    expect(startOfWeek(d(2026, 3, 31), 1).getHours()).toBe(0)
  })
})

describe('issue numbers', () => {
  it('matches ISO weeks', () => {
    expect(isoWeek(d(2026, 10, 20))).toBe(43)
    expect(isoWeek(d(2026, 1, 1))).toBe(1)
    expect(isoWeek(d(2026, 12, 31))).toBe(53) // 2026 has 53 ISO weeks
    expect(isoWeek(d(2027, 1, 3))).toBe(53)
    expect(isoWeek(d(2027, 1, 4))).toBe(1)
  })

  it('numbers an issue by its midpoint', () => {
    expect(issueNumber('2026-10-19')).toBe(43)
    expect(issueNumber('2026-10-18')).toBe(43) // Sunday-start week
    expect(issueNumber('2026-12-28')).toBe(53)
  })
})

describe('formatting & progress', () => {
  it('formats a range within a month and across months', () => {
    expect(formatWeekRange('2026-10-19')).toBe('OCT 19–25')
    expect(formatWeekRange('2026-09-28')).toBe('SEP 28–OCT 4')
    expect(formatWeekRange('2026-12-28')).toBe('DEC 28–JAN 3')
  })

  it('lists the seven days', () => {
    const days = weekDays('2026-10-19')
    expect(days).toHaveLength(7)
    expect(days[6].getDate()).toBe(25)
  })

  it('computes elapsed fraction and days left', () => {
    expect(weekProgress(d(2026, 10, 19, 0), 1)).toBe(0)
    expect(weekProgress(d(2026, 10, 22, 12), 1)).toBeCloseTo(0.5, 2)
    expect(daysLeft(d(2026, 10, 19), 1)).toBe(7)
    expect(daysLeft(d(2026, 10, 25), 1)).toBe(1)
    expect(daysLeft(d(2026, 10, 25), 0)).toBe(7)
  })
})
