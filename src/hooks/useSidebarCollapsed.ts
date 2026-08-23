import { useCallback } from 'react'
import { usePersistedValue } from './usePersistedValue'

export const SIDEBAR_COLLAPSED_KEY = 'notepad.sidebarCollapsed'

/** Whether the folder pane is hidden, persisted in `localStorage`. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = usePersistedValue(SIDEBAR_COLLAPSED_KEY, false, (raw) => raw === 'true')
  const toggle = useCallback(() => setCollapsed((value) => !value), [setCollapsed])
  return [collapsed, toggle]
}
