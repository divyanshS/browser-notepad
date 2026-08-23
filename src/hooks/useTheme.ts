import { useEffect } from 'react'
import { usePersistedValue } from './usePersistedValue'

export const THEME_KEY = 'notepad.theme'
export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value)
}

/**
 * User-selected appearance, persisted in `localStorage` and applied as
 * `data-theme` on `<html>`. `system` removes the attribute so the
 * `prefers-color-scheme` media query decides.
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = usePersistedValue<Theme>(THEME_KEY, 'system', (raw) => (isTheme(raw) ? raw : 'system'))

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  return [theme, setTheme]
}
