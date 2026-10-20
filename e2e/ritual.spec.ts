import { expect, test } from '@playwright/test'
import { addTask, gotoPane, openBlank, readStore, tickets, NEXT_TUE } from './helpers'

test('a new week opens the New Issue ritual for leftovers', async ({ page }) => {
  await openBlank(page)
  await addTask(page, 'Carry me')
  await addTask(page, 'Someday me')
  await addTask(page, 'Let me go')
  await addTask(page, 'Already done')
  await page.getByRole('checkbox', { name: 'Mark done: Already done' }).click()

  // A week passes…
  await page.clock.setSystemTime(NEXT_TUE)
  await page.reload()

  const ritual = page.getByRole('dialog', { name: 'Issue 44 is out' })
  await expect(ritual).toBeVisible()
  await expect(ritual.getByTestId('leftover')).toHaveCount(3)
  await expect(page.getByTestId('issue-number')).toHaveText('44')

  // Esc can't dismiss it — each ticket needs a decision.
  await page.keyboard.press('Escape')
  await expect(ritual).toBeVisible()

  await ritual.getByRole('group', { name: 'Fate of Carry me' }).getByRole('button', { name: 'Carry over' }).click()
  await ritual.getByRole('group', { name: 'Fate of Someday me' }).getByRole('button', { name: 'Someday' }).click()
  await ritual.getByRole('group', { name: 'Fate of Let me go' }).getByRole('button', { name: 'Let go' }).click()
  await expect(ritual).toBeHidden()

  await expect(tickets(page, 'week')).toHaveText([/Carry me/])
  await gotoPane(page, 'Someday')
  await expect(tickets(page, 'someday')).toHaveText([/Someday me/])

  // Back issues hold last week's done + let-go tickets
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /Back Issues/ }).click()
  const back = page.getByRole('dialog', { name: 'Back issues' })
  await expect(back.getByText('Nº 43')).toBeVisible()
  await back.getByRole('button', { name: /Nº 43/ }).click()
  await expect(back.locator('.issue__item--done')).toHaveText([/Already done/])
  await expect(back.locator('.issue__item--let-go')).toHaveText([/Let me go/])

  // Reprint brings one back into Someday
  await back.locator('.issue__item--let-go').getByRole('button', { name: 'Reprint' }).click()
  await page.keyboard.press('Escape')
  await expect(tickets(page, 'someday')).toHaveCount(2)

  const s = await readStore(page)
  expect(s.lastIssueKey).toBe('2026-10-26')
})

test('bulk "carry all" resolves every leftover', async ({ page }) => {
  await openBlank(page)
  await addTask(page, 'one')
  await addTask(page, 'two')
  await page.clock.setSystemTime(NEXT_TUE)
  await page.reload()
  await page.getByRole('button', { name: 'Carry all over' }).click()
  await expect(page.getByRole('dialog', { name: /is out/ })).toBeHidden()
  await expect(tickets(page, 'week')).toHaveCount(2)
})
