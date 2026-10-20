# Week of Wonder

A mobile-first PWA to-do app styled as a weekly risograph zine. Each week is a new **issue**.

- **This Week**: tasks for the current issue, plus a day strip and a "print run" bar showing how much of the week has passed.
- **Someday / no rush**: a pinboard for everything without a deadline.

Every task is a perforated **ticket**. A ticket has an **ink** (one of 8 colors named after real riso drums, or Plain), **steps** (subtasks) and **notes**. Ticking a ticket off stamps it **DONE**.

## Features

- Quick add with rapid multi-entry. You choose the pane and ink as you type.
- A ticket's detail sheet holds:
  - an editable title and ink
  - steps you can reorder by dragging, with Enter to add the next step and Backspace on an empty step to delete it
  - auto-growing notes, where links turn into chips
  - move, duplicate, and delete with undo
- Each pane sorts **Manual** (long-press drag to reorder) or **By ink** (grouped in spectrum order). You can filter by ink and show or hide finished ("printed") tickets.
- **The New Issue ritual.** When a new week starts, each unfinished This Week ticket gets a choice:
  - **Carry over**
  - **Send to Someday**
  - **Let go**

  Finished tickets are filed into **Back Issues**, where you can reprint any of them.
- Light paper and dark "night" stock, or follow the system setting. Weeks can start on Monday or Sunday.
- Local-first: data lives in `localStorage`. You can save and restore JSON backups. No account or backend is needed.
- Installable PWA that works offline (Workbox precache), with an update prompt when a new version is deployed.

## Stack

Vite, React 19, TypeScript, Zustand (persisted), @dnd-kit, vite-plugin-pwa, and self-hosted fonts via Fontsource: Bricolage Grotesque, Instrument Serif and Space Mono.

## Scripts

```bash
npm install
npm run dev          # local dev server
npm run build        # typecheck + production build (dist/)
npm run preview      # serve the production build
npm test             # unit tests (Vitest): week math, store, rollover, import/export
npm run test:e2e     # Playwright on emulated iPhone 14 (WebKit) and Pixel 7 (Chromium)
npm run lint         # oxlint
npm run icons        # re-render PNG icons from public/favicon.svg
```

The first time you run the e2e tests, install the browsers with `npx playwright install chromium webkit`.

## Deploying

Push to GitHub and import the repo in Vercel. The framework (Vite) is detected automatically. `vercel.json` sets the cache headers so the service worker and manifest always revalidate while hashed assets stay immutable.

## Project layout

```
src/
  lib/          pure logic: week math, inks, rollover, sorting, install prompt
  store/        Zustand stores (persisted data + transient UI)
  components/   panes, tickets, sheets, ritual, menu
  styles/       design tokens (light/dark) and the zine stylesheet
e2e/            Playwright specs
scripts/        icon renderer
```
