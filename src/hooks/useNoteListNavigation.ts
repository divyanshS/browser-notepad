import { useCallback, useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'
import type { Note } from '../types'

/** DOM id of a note's list row, used for `aria-activedescendant` and scrolling. */
export function noteOptionId(noteId: string): string {
  return `note-option-${noteId}`
}

export interface NoteListNavigation {
  listRef: RefObject<HTMLUListElement | null>
  /** ArrowUp/ArrowDown move the selection through `notes`. */
  onKeyDown: (event: KeyboardEvent<HTMLUListElement>) => void
}

/** Keeps the selected row visible when the selection changes. */
function scrollOptionIntoView(list: HTMLElement | null, noteId: string | null): void {
  if (!list || !noteId) return
  const option = list.querySelector<HTMLElement>(`[id="${noteOptionId(noteId)}"]`)
  if (option && typeof option.scrollIntoView === 'function') option.scrollIntoView({ block: 'nearest' })
}

/** Keyboard navigation (↑/↓) and scroll-into-view for the note listbox. */
export function useNoteListNavigation(
  notes: Note[] | undefined,
  selectedNoteId: string | null,
  onSelect: (noteId: string) => void,
): NoteListNavigation {
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    scrollOptionIntoView(listRef.current, selectedNoteId)
  }, [selectedNoteId])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLUListElement>) => {
      if (!notes || notes.length === 0) return
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      event.preventDefault()
      const index = notes.findIndex((note) => note.id === selectedNoteId)
      const step = event.key === 'ArrowDown' ? 1 : -1
      const nextIndex = index === -1 ? 0 : Math.min(notes.length - 1, Math.max(0, index + step))
      onSelect(notes[nextIndex].id)
    },
    [notes, selectedNoteId, onSelect],
  )

  return { listRef, onKeyDown }
}
