import { useCallback, useMemo, useState } from 'react'
import { ALL_NOTES_ID, type FolderSelection, type Note } from '../types'
import { useNotes } from './useNotes'

export interface SelectionState {
  folderSelection: FolderSelection
  selectedNoteId: string | null
  /** Notes of the selected folder (newest first); `undefined` while loading. */
  notes: Note[] | undefined
  /** Selects a folder (or "All Notes") and auto-selects its most recent note once the list is known. */
  selectFolder: (selection: FolderSelection) => void
  selectNote: (noteId: string | null) => void
}

/**
 * Folder and note selection. When the folder changes, the most recent note of
 * the new selection is selected as soon as the note list reflects it.
 */
export function useSelection(allNotes: Note[] | undefined): SelectionState {
  const [folderSelection, setFolderSelection] = useState<FolderSelection>(ALL_NOTES_ID)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [autoSelectPending, setAutoSelectPending] = useState(false)
  const notes = useNotes(allNotes, folderSelection)

  // Resolve a pending auto-select during render (React re-renders before committing).
  if (autoSelectPending && notes !== undefined) {
    setAutoSelectPending(false)
    setSelectedNoteId(notes[0]?.id ?? null)
  }

  const selectFolder = useCallback((selection: FolderSelection) => {
    setFolderSelection(selection)
    setAutoSelectPending(true)
  }, [])

  const selectNote = useCallback((noteId: string | null) => {
    setAutoSelectPending(false)
    setSelectedNoteId(noteId)
  }, [])

  return useMemo(
    () => ({ folderSelection, selectedNoteId, notes, selectFolder, selectNote }),
    [folderSelection, selectedNoteId, notes, selectFolder, selectNote],
  )
}
