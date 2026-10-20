/**
 * The palette is modeled on real risograph drum inks. Spectrum order
 * (the array order) drives "sort by ink".
 */
export const INKS = [
  { id: 'pink', name: 'Fluoro Pink' },
  { id: 'red', name: 'Bright Red' },
  { id: 'orange', name: 'Orange' },
  { id: 'sunflower', name: 'Sunflower' },
  { id: 'green', name: 'Green' },
  { id: 'teal', name: 'Teal' },
  { id: 'blue', name: 'Federal Blue' },
  { id: 'violet', name: 'Violet' },
] as const

export type InkId = (typeof INKS)[number]['id']

export const INK_IDS: InkId[] = INKS.map((i) => i.id)

export function isInkId(value: unknown): value is InkId {
  return typeof value === 'string' && (INK_IDS as string[]).includes(value)
}

export function inkName(id: InkId | null): string {
  return id ? (INKS.find((i) => i.id === id)?.name ?? id) : 'Plain'
}

/** Spectrum rank; plain (no ink) sorts last. */
export function inkRank(id: InkId | null): number {
  return id ? INK_IDS.indexOf(id) : INK_IDS.length
}

/** CSS custom property for an ink (defined in tokens.css for light/dark). */
export function inkVar(id: InkId | null): string {
  return id ? `var(--ink-${id})` : 'var(--ink-plain)'
}

export function inkOnVar(id: InkId | null): string {
  return id ? `var(--on-${id})` : 'var(--on-plain)'
}
