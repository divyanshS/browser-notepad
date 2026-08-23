import { useMemo } from 'react'
import type { Note } from '../types'
import { NotesSearchIndex, type SearchHit } from './searchIndex'

/** Result of {@link useNotesSearch}: ordered hits plus a per-note lookup of the matched terms for highlighting. */
export interface NotesSearchResult {
  hits: SearchHit[]
  hitTerms: Map<string, string[]>
}

const EMPTY_RESULT: NotesSearchResult = { hits: [], hitTerms: new Map() }

/**
 * Searches `notes` synchronously with an in-memory {@link NotesSearchIndex}.
 * The index is rebuilt whenever the `notes` array identity changes (e.g. after every save via `useLiveQuery`),
 * and the search re-runs on every keystroke without debouncing — MiniSearch is fast enough.
 * An empty or whitespace-only query, or no notes yet, yields no hits.
 */
export function useNotesSearch(notes: Note[] | undefined, query: string): NotesSearchResult {
  const index = useMemo(() => {
    if (notes === undefined) return null
    const built = new NotesSearchIndex()
    built.replaceAll(notes)
    return built
  }, [notes])

  return useMemo(() => {
    if (index === null || query.trim().length === 0) return EMPTY_RESULT
    const hits = index.search(query)
    const hitTerms = new Map(hits.map((hit) => [hit.id, hit.terms]))
    return { hits, hitTerms }
  }, [index, query])
}
