import { useCallback, useEffect, useMemo, useState } from 'react'

/** `localStorage` key holding the ids of expanded folders as a JSON array. */
export const EXPANDED_FOLDERS_KEY = 'notepad.expandedFolders'

export interface ExpandedFolders {
  expanded: ReadonlySet<string>
  isExpanded: (id: string) => boolean
  toggle: (id: string) => void
  expand: (id: string) => void
}

function readStoredIds(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_FOLDERS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function writeStoredIds(ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(EXPANDED_FOLDERS_KEY, JSON.stringify([...ids]))
  } catch {
    // Storage may be unavailable (private mode, quota); expansion state is a convenience only.
  }
}

/** Expanded/collapsed state of the folder tree, persisted in `localStorage`. */
export function useExpandedFolders(): ExpandedFolders {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(readStoredIds)

  useEffect(() => {
    writeStoredIds(expanded)
  }, [expanded])

  const isExpanded = useCallback((id: string) => expanded.has(id), [expanded])

  const toggle = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  const expand = useCallback((id: string) => {
    setExpanded((current) => (current.has(id) ? current : new Set(current).add(id)))
  }, [])

  return useMemo(() => ({ expanded, isExpanded, toggle, expand }), [expanded, isExpanded, toggle, expand])
}
