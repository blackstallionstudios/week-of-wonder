import type { CSSProperties } from 'react'
import { INKS, inkName, inkVar, type InkId } from '../lib/inks'

interface InkPickerProps {
  value: InkId | null
  onChange(ink: InkId | null): void
  label?: string
  compact?: boolean
}

/** A row of ink "drums". The selected ink gets a registration-mark ring. */
export function InkPicker({ value, onChange, label = 'Ink', compact = false }: InkPickerProps) {
  const options: (InkId | null)[] = [null, ...INKS.map((i) => i.id)]
  return (
    <div className={`inkpicker ${compact ? 'inkpicker--compact' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((id) => {
        const selected = value === id
        return (
          <button
            key={id ?? 'plain'}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={inkName(id)}
            title={inkName(id)}
            className={`inkdrum ${id === null ? 'inkdrum--plain' : ''} ${selected ? 'is-selected' : ''}`}
            style={{ '--drum': inkVar(id) } as CSSProperties}
            onClick={() => onChange(id)}
          >
            <span className="inkdrum__dot" />
          </button>
        )
      })}
    </div>
  )
}
