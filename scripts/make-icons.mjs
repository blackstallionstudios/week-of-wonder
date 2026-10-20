// Renders the SVG master icon into the PNG sizes a PWA needs.
// Usage: node scripts/make-icons.mjs
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const targets = [
  { file: 'pwa-192.png', size: 192, maskable: false },
  { file: 'pwa-512.png', size: 512, maskable: false },
  { file: 'pwa-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const { file, size, maskable } of targets) {
  // Maskable icons need full-bleed paper with the art inside the 80% safe zone.
  const inner = maskable ? svg.replace('rx="112"', 'rx="0"') : svg
  const scale = maskable ? 0.78 : 1
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<!doctype html><html><body style="margin:0;background:${maskable ? '#f4efe4' : 'transparent'}">
    <div style="width:${size}px;height:${size}px;display:grid;place-items:center">
      <div style="width:${size * scale}px;height:${size * scale}px">${inner.replace('<svg ', `<svg width="${size * scale}" height="${size * scale}" `)}</div>
    </div></body></html>`)
  await page.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname, omitBackground: !maskable })
  console.log('wrote', file)
}
await browser.close()
