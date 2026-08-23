import type { ReactElement } from 'react'
import { THEMES, type Theme } from '../hooks/useTheme'

const LABELS: Record<Theme, string> = { system: 'Auto', light: 'Light', dark: 'Dark' }

export interface ThemePickerProps {
  theme: Theme
  onChange: (theme: Theme) => void
}

/** Segmented control for choosing the appearance: follow the OS, light, or dark. */
export function ThemePicker({ theme, onChange }: ThemePickerProps): ReactElement {
  return (
    <div className="segmented" role="radiogroup" aria-label="Appearance">
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={theme === option}
          className={`segmented-option${theme === option ? ' is-selected' : ''}`}
          onClick={() => onChange(option)}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  )
}
