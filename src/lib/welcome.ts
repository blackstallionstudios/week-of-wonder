import { useStore } from '../store/useStore'

/** First-run sample tickets that double as a tour of the features. */
export function seedWelcome(): void {
  const { addTask, addSubtask, updateTask, toggleDone } = useStore.getState()

  // Added bottom-up because new tickets land on top.
  const done = addTask('week', 'Open your first issue', 'sunflower')
  toggleDone(done)

  const drag = addTask('week', 'Long-press a ticket, then drag to reorder', 'teal')
  updateTask(drag, { notes: 'Switch the pane to “By ink” to group tickets by colour instead.' })

  const steps = addTask('week', 'Tap me — I have steps & notes', 'pink')
  addSubtask(steps, 'Tick a step off')
  addSubtask(steps, 'Add a step of your own')
  addSubtask(steps, 'Pick a different ink')
  updateTask(steps, {
    notes: 'Notes live in the margins. Links like https://en.wikipedia.org/wiki/Risograph turn into chips.',
  })

  addTask('someday', 'Learn to bind a zine by hand', 'violet')
  const trip = addTask('someday', 'Swipe left from This Week to find this pane', 'blue')
  updateTask(trip, { notes: 'Someday has no deadline. When a new week starts, leftovers can be sent here.' })
}
