import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { addTask, openBlank, readStore, tickets } from './helpers'

test.describe('settings & data', () => {
  test.beforeEach(async ({ page }) => openBlank(page))

  test('switches theme and remembers it', async ({ page }) => {
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('radio', { name: 'Night' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#15131c')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('radio', { name: 'Paper' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('switching week start to Sunday keeps the current tickets', async ({ page }) => {
    await addTask(page, 'Still here')
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('radio', { name: 'Sunday' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /is out/ })).toBeHidden()
    await expect(page.locator('.day').first()).toContainText('S')
    await expect(page.locator('.day').first()).toContainText('18')
    await expect(tickets(page, 'week')).toHaveCount(1)
  })

  test('exports and imports a backup', async ({ page }, info) => {
    await addTask(page, 'Back me up', { ink: 'Orange' })
    await page.getByRole('button', { name: 'Menu' }).click()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Save a backup/ }).click()])
    const path = info.outputPath('backup.json')
    await download.saveAs(path)
    const json = JSON.parse(await readFile(path, 'utf8'))
    expect(json.app).toBe('week-of-wonder')
    expect(json.tasks[0].title).toBe('Back me up')

    // Erase, then restore
    await page.getByRole('button', { name: /Erase everything/ }).click()
    await page.getByRole('button', { name: 'Erase all' }).click()
    await expect(tickets(page, 'week')).toHaveCount(0)
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByTestId('import-input').setInputFiles(path)
    await expect(tickets(page, 'week')).toHaveText([/Back me up/])
    expect((await readStore(page)).tasks[0].ink).toBe('orange')
  })

  test('rejects a broken backup politely', async ({ page }) => {
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByTestId('import-input').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{oops') })
    await expect(page.getByText('That file is not valid JSON')).toBeVisible()
  })
})

test.describe('layout & accessibility', () => {
  test('nothing overflows horizontally on a small phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await openBlank(page)
    await addTask(page, 'A very long ticket title that keeps going and going to check wrapping behaviour on tiny screens', { ink: 'Teal' })
    const overflow = await page.evaluate(() => {
      const pages = [...document.querySelectorAll<HTMLElement>('.page')]
      window.scrollTo(100, 0)
      return {
        scrolled: window.scrollX,
        doc: document.documentElement.scrollWidth - window.innerWidth,
        body: document.body.scrollWidth - window.innerWidth,
        pages: pages.map((p) => p.scrollWidth - p.clientWidth),
      }
    })
    expect(overflow.scrolled).toBe(0)
    expect(overflow.doc).toBeLessThanOrEqual(0)
    expect(overflow.body).toBeLessThanOrEqual(0)
    for (const p of overflow.pages) expect(p).toBeLessThanOrEqual(0)
  })

  test('interactive controls are labelled and inputs avoid iOS zoom', async ({ page }) => {
    await openBlank(page)
    await addTask(page, 'Label check')
    await tickets(page, 'week').first().getByRole('button', { name: /Open/ }).click()
    const problems = await page.evaluate(() => {
      const out: string[] = []
      for (const el of document.querySelectorAll<HTMLElement>('button, input:not([type=hidden]):not([hidden]), textarea')) {
        if (el.closest('[hidden]') || (el as HTMLInputElement).type === 'file') continue
        const name = el.getAttribute('aria-label') || el.textContent?.trim() || el.getAttribute('title') || (el as HTMLInputElement).labels?.[0]?.textContent?.trim()
        if (!name) out.push(`unlabelled ${el.outerHTML.slice(0, 80)}`)
        if (el.matches('input:not([type=checkbox]), textarea') && parseFloat(getComputedStyle(el).fontSize) < 16) {
          out.push(`small font ${el.outerHTML.slice(0, 80)}`)
        }
      }
      return out
    })
    expect(problems).toEqual([])
  })
})

test.describe('PWA', () => {
  test('has a valid manifest with installable icons', async ({ page, request }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()
    const manifest = await (await request.get(href!)).json()
    expect(manifest).toMatchObject({ name: 'Week of Wonder', display: 'standalone', start_url: '/' })
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
    for (const icon of manifest.icons) {
      const res = await request.get(`/${icon.src}`)
      expect(res.status()).toBe(200)
      expect(res.headers()['content-type']).toContain('image/png')
    }
    expect((await request.get('/apple-touch-icon.png')).status()).toBe(200)
  })

  test('works offline after the first visit', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Service worker control is only reliable in Chromium under Playwright')
    await openBlank(page)
    await addTask(page, 'Offline-proof')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload() // let the SW take control
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'This Week' })).toBeVisible()
    await expect(tickets(page, 'week')).toHaveText([/Offline-proof/])
    await context.setOffline(false)
  })
})
