import { useEffect } from 'react'
import { BackIssues } from './components/BackIssues'
import { BottomBar, Masthead, PanePager } from './components/Chrome'
import { Menu } from './components/Menu'
import { NewIssueRitual } from './components/NewIssueRitual'
import { QuickAdd } from './components/QuickAdd'
import { TaskSheet } from './components/TaskSheet'
import { Toasts, UpdatePrompt } from './components/Toasts'
import { seedWelcome } from './lib/welcome'
import { useStore } from './store/useStore'
import { useUI } from './store/useUI'

const THEME_COLORS = { light: '#f4efe4', dark: '#15131c' }

function useTheme() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light)
    }
    apply()
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

/** Keep "now" fresh and turn the week over when the app comes back into view. */
function useClock() {
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      useUI.getState().setNow(now)
      useStore.getState().checkRollover(now)
    }
    const onVis = () => document.visibilityState === 'visible' && tick()
    const id = window.setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', tick)
    }
  }, [])
}

/** Track the visual viewport so sheets stay above the on-screen keyboard. */
function useVisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => document.documentElement.style.setProperty('--vvh', `${vv.height}px`)
    update()
    vv.addEventListener('resize', update)
    return () => vv.removeEventListener('resize', update)
  }, [])
}

export default function App() {
  useTheme()
  useClock()
  useVisualViewport()

  useEffect(() => {
    const s = useStore.getState()
    const firstRun = s.lastIssueKey === null && s.tasks.length === 0
    s.checkRollover()
    if (firstRun) seedWelcome()
  }, [])

  return (
    <div className="app">
      <Masthead />
      <PanePager />
      <BottomBar />
      <TaskSheet />
      <QuickAdd />
      <Menu />
      <BackIssues />
      <NewIssueRitual />
      <Toasts />
      <UpdatePrompt />
    </div>
  )
}
