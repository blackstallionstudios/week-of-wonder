import { expect, type Page } from '@playwright/test'

/** Tuesday 20 Oct 2026, 10:00 local — inside ISO week 43 (Mon 19 – Sun 25). */
export const TUE = new Date(2026, 9, 20, 10)
export const NEXT_TUE = new Date(2026, 9, 27, 10)

const STORAGE_KEY = 'week-of-wonder'

/** Start with a blank, already-initialised store (no welcome tickets). */
export async function openBlank(page: Page, at: Date = TUE) {
  await page.clock.install({ time: at })
  await page.addInitScript((key) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem(
      key,
      JSON.stringify({ state: { tasks: [], lastIssueKey: 'blank', backIssues: [] }, version: 1 }),
    )
  }, STORAGE_KEY)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'This Week' })).toBeVisible()
}

export async function readStore(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').state, STORAGE_KEY)
}

export async function addTask(page: Page, title: string, opts: { ink?: string; pane?: 'This Week' | 'Someday' } = {}) {
  await page.getByRole('button', { name: 'Add a task' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a task' })
  if (opts.pane) await dialog.getByRole('radio', { name: opts.pane }).click()
  if (opts.ink) await dialog.getByRole('radio', { name: opts.ink }).click()
  await dialog.getByLabel('Task title').fill(title)
  await dialog.getByLabel('Task title').press('Enter')
  await expect(dialog.getByRole('list', { name: 'Just added' })).toContainText(title)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
}

export function pane(page: Page, id: 'week' | 'someday') {
  return page.locator(`#pane-${id}`)
}

export function tickets(page: Page, id: 'week' | 'someday') {
  return pane(page, id).locator('.tickets:not(.tickets--done) > [data-testid="task"]')
}

export async function gotoPane(page: Page, name: 'This Week' | 'Someday') {
  await page.getByRole('tab', { name: new RegExp(name) }).click()
  await expect(page.getByRole('tab', { name: new RegExp(name) })).toHaveAttribute('aria-selected', 'true')
}
