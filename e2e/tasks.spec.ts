import { expect, test } from '@playwright/test'
import { addTask, gotoPane, openBlank, pane, readStore, tickets, TUE } from './helpers'

test.describe('first run', () => {
  test('prints a welcome issue with sample tickets', async ({ page }) => {
    await page.clock.install({ time: TUE })
    await page.goto('/')
    await expect(page.getByTestId('issue-number')).toHaveText('43')
    await expect(page.getByText('OCT 19–25')).toBeVisible()
    await expect(tickets(page, 'week')).toHaveCount(2)
    await expect(page.getByTestId('count-week')).toHaveText('2')
    await expect(page.getByTestId('count-someday')).toHaveText('2')
    await expect(page.locator('.day--today')).toContainText('20')
  })
})

test.describe('tasks', () => {
  test.beforeEach(async ({ page }) => openBlank(page))

  test('nudges iPhone users to install, once', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'The tip only appears in iOS Safari')
    const tip = page.getByRole('complementary', { name: 'Install tip' })
    await expect(tip).toContainText('Add to Home Screen')
    await tip.getByRole('button', { name: 'Dismiss install tip' }).click()
    await expect(tip).toBeHidden()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'This Week' })).toBeVisible()
    await expect(tip).toBeHidden()
  })

  test('shows friendly empty states', async ({ page }) => {
    await expect(page.getByText('Nothing on the press.')).toBeVisible()
    await gotoPane(page, 'Someday')
    await expect(page.getByText('The someday drawer is empty.')).toBeVisible()
  })

  test('adds tickets to both panes with inks, and they persist', async ({ page }) => {
    await addTask(page, 'Return library books', { ink: 'Teal' })
    await addTask(page, 'Learn to juggle', { pane: 'Someday', ink: 'Violet' })
    await expect(tickets(page, 'week')).toHaveCount(1)
    await expect(tickets(page, 'week').first()).toHaveAttribute('data-ink', 'teal')
    await expect(page.getByTestId('count-someday')).toHaveText('1')

    await page.reload()
    await expect(tickets(page, 'week').first()).toContainText('Return library books')
    await gotoPane(page, 'Someday')
    await expect(tickets(page, 'someday').first()).toContainText('Learn to juggle')
    await expect(tickets(page, 'someday').first()).toHaveAttribute('data-ink', 'violet')
  })

  test('quick add supports rapid multi-add', async ({ page }) => {
    await page.getByRole('button', { name: 'Add a task' }).click()
    const input = page.getByLabel('Task title')
    for (const t of ['one', 'two', 'three']) {
      await input.fill(t)
      await input.press('Enter')
    }
    await expect(input).toBeFocused()
    await page.keyboard.press('Escape')
    // Newest on top.
    await expect(tickets(page, 'week')).toHaveText([/three/, /two/, /one/])
  })

  test('edits title, subtasks and notes in the detail sheet', async ({ page }) => {
    await addTask(page, 'Plan picnic', { ink: 'Sunflower' })
    await tickets(page, 'week').first().getByRole('button', { name: /Open Plan picnic/ }).click()
    const sheet = page.getByRole('dialog', { name: /Ticket/ })
    await expect(sheet).toBeVisible()

    const title = sheet.getByLabel('Title')
    await expect(title).toBeVisible()
    await title.fill('Plan a picnic')

    // Chain subtasks with Enter
    await sheet.getByLabel('New subtask').fill('Bread')
    await sheet.getByLabel('New subtask').press('Enter')
    await sheet.getByLabel('New subtask').fill('Cheese')
    await sheet.getByLabel('New subtask').press('Enter')
    await expect(sheet.getByTestId('subtask')).toHaveCount(2)
    // Enter inside a subtask inserts a new one right after it
    await sheet.getByTestId('subtask').first().getByLabel('Subtask').press('Enter')
    await expect(sheet.getByTestId('subtask')).toHaveCount(3)
    await expect(sheet.getByTestId('subtask').nth(1).getByLabel('Subtask')).toBeFocused()
    await page.keyboard.type('Butter')
    await expect(sheet.getByTestId('subtask').nth(1).getByLabel('Subtask')).toHaveValue('Butter')

    await sheet.getByLabel('Done: Bread').check({ force: true })
    await expect(sheet.getByText('1/3')).toBeVisible()

    await sheet.getByRole('textbox', { name: 'Notes' }).fill('Bring the blanket. Map: https://example.com/park')
    await expect(sheet.getByRole('link', { name: /example.com\/park/ })).toBeVisible()

    await sheet.getByLabel('Task ink').getByRole('radio', { name: 'Green' }).click()
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()

    const card = tickets(page, 'week').first()
    await expect(card).toContainText('Plan a picnic')
    await expect(card).toHaveAttribute('data-ink', 'green')
    await expect(card.getByLabel('1 of 3 subtasks done')).toBeVisible()

    // Inline subtask checking from the card
    await card.getByRole('button', { name: 'Show subtasks' }).click()
    await card.getByText('Cheese').click()
    await expect(card.getByLabel('2 of 3 subtasks done')).toBeVisible()

    await page.reload()
    const s = await readStore(page)
    expect(s.tasks[0]).toMatchObject({ title: 'Plan a picnic', ink: 'green', notes: expect.stringContaining('blanket') })
    expect(s.tasks[0].subtasks.map((x: { title: string }) => x.title)).toEqual(['Bread', 'Butter', 'Cheese'])
  })

  test('completes a ticket with a stamp, files it under Printed, and can undo', async ({ page }) => {
    await addTask(page, 'Water the ferns')
    await page.getByRole('checkbox', { name: 'Mark done: Water the ferns' }).click()
    await expect(tickets(page, 'week')).toHaveCount(0)
    await expect(page.getByText('Issue fully printed!')).toBeVisible()
    const toggle = pane(page, 'week').getByRole('button', { name: /Printed/ })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    const done = pane(page, 'week').locator('.tickets--done [data-testid="task"]')
    await expect(done).toHaveCount(1)
    await expect(done.locator('.stamp')).toHaveText('DONE')
    await done.getByRole('checkbox', { name: /Mark not done/ }).click()
    await expect(tickets(page, 'week')).toHaveCount(1)
  })

  test('sorts by ink in spectrum order and filters by ink', async ({ page }) => {
    await addTask(page, 'violet task', { ink: 'Violet' })
    await addTask(page, 'plain task')
    await addTask(page, 'pink task', { ink: 'Fluoro Pink' })
    await addTask(page, 'sunflower task', { ink: 'Sunflower' })
    await expect(tickets(page, 'week')).toHaveText([/sunflower/, /pink/, /plain/, /violet/])

    await pane(page, 'week').getByRole('button', { name: 'By ink' }).click()
    await expect(pane(page, 'week').locator('[data-testid="task"]')).toHaveText([/pink/, /sunflower/, /violet/, /plain/])
    await expect(pane(page, 'week').locator('.inkgroup__title')).toHaveText([/Fluoro Pink/, /Sunflower/, /Violet/, /Plain/])

    await pane(page, 'week').getByRole('button', { name: 'Only Violet' }).click()
    await expect(pane(page, 'week').locator('[data-testid="task"]')).toHaveText([/violet/])
    await pane(page, 'week').getByRole('button', { name: 'Clear ink filter' }).click()
    await expect(pane(page, 'week').locator('[data-testid="task"]')).toHaveCount(4)

    // The sort mode is remembered
    await page.reload()
    await expect(pane(page, 'week').getByRole('button', { name: 'By ink' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('moves tickets between panes', async ({ page }) => {
    await addTask(page, 'Fix the bike')
    await tickets(page, 'week').first().getByRole('button', { name: /Open/ }).click()
    await page.getByRole('button', { name: 'Move to Someday' }).click()
    await expect(page.getByText('Filed under Someday')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(tickets(page, 'week')).toHaveCount(0)
    await gotoPane(page, 'Someday')
    await expect(tickets(page, 'someday')).toHaveText([/Fix the bike/])
    await tickets(page, 'someday').first().getByRole('button', { name: /Open/ }).click()
    await page.getByRole('button', { name: 'Pull into This Week' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('count-week')).toHaveText('1')
    const s = await readStore(page)
    expect(s.tasks[0]).toMatchObject({ pane: 'week', weekKey: '2026-10-19' })
  })

  test('deletes with undo, and duplicates', async ({ page }) => {
    await addTask(page, 'Call the plumber')
    await tickets(page, 'week').first().getByRole('button', { name: /Open/ }).click()
    await page.getByRole('button', { name: 'Duplicate' }).click()
    await page.keyboard.press('Escape')
    await expect(tickets(page, 'week')).toHaveCount(2)

    await tickets(page, 'week').first().getByRole('button', { name: /Open/ }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(tickets(page, 'week')).toHaveCount(1)
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(tickets(page, 'week')).toHaveCount(2)
  })

  test('long-press drag reorders tickets', async ({ page }) => {
    await addTask(page, 'C')
    await addTask(page, 'B')
    await addTask(page, 'A')
    await expect(tickets(page, 'week')).toHaveText([/A/, /B/, /C/])

    const first = await tickets(page, 'week').nth(0).locator('.ticket__title').boundingBox()
    const last = await tickets(page, 'week').nth(2).boundingBox()
    if (!first || !last) throw new Error('no boxes')
    await page.mouse.move(first.x + 20, first.y + first.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(400) // long-press
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(first.x + 20, first.y + first.height / 2 + ((last.y + last.height - 4 - first.y) * i) / 12)
      await page.waitForTimeout(16)
    }
    await page.mouse.up()
    await expect(tickets(page, 'week')).toHaveText([/B/, /C/, /A/])
    // The drop must not also count as a tap that opens the ticket.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.reload()
    await expect(tickets(page, 'week')).toHaveText([/B/, /C/, /A/])
  })

  test('real touch long-press drag reorders tickets', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Raw touch events are driven through the Chrome DevTools Protocol')
    await addTask(page, 'C')
    await addTask(page, 'B')
    await addTask(page, 'A')
    const first = await tickets(page, 'week').nth(0).locator('.ticket__title').boundingBox()
    const last = await tickets(page, 'week').nth(2).boundingBox()
    if (!first || !last) throw new Error('no boxes')
    const cdp = await page.context().newCDPSession(page)
    const x = first.x + 20
    const y0 = first.y + first.height / 2
    const y1 = last.y + last.height - 4
    const touch = (type: string, y?: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: y === undefined ? [] : [{ x, y }] })
    await touch('touchStart', y0)
    await page.waitForTimeout(450) // long-press
    for (let i = 1; i <= 14; i++) {
      await touch('touchMove', y0 + ((y1 - y0) * i) / 14)
      await page.waitForTimeout(16)
    }
    await touch('touchEnd')
    await expect(tickets(page, 'week')).toHaveText([/B/, /C/, /A/])
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('toast actions are clickable while a sheet is open', async ({ page }) => {
    await addTask(page, 'Wander off')
    await tickets(page, 'week').first().getByRole('button', { name: /Open/ }).click()
    await page.getByRole('button', { name: 'Move to Someday' }).click()
    await page.getByRole('button', { name: 'Go' }).click()
    await expect(page.getByRole('tab', { name: /Someday/ })).toHaveAttribute('aria-selected', 'true')
  })

  test('swiping the pager switches panes', async ({ page }) => {
    await page.locator('.pager').evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: 'instant' }))
    await expect(page.getByRole('tab', { name: /Someday/ })).toHaveAttribute('aria-selected', 'true')
    // Quick add now defaults to the visible pane
    await page.getByRole('button', { name: 'Add a task' }).click()
    await expect(page.getByRole('radio', { name: 'Someday' })).toHaveAttribute('aria-checked', 'true')
  })
})
