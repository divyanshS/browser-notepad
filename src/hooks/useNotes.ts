import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../db/db'
import { ALL_NOTES_ID, type FolderSelection, type Note } from '../types'

/** Live view of every note, newest first. `undefined` until the first query resolves. */
export function useAllNotes(): Note[] | undefined {
  return useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), [])
}

/** Notes shown for a folder selection: everything for "All Notes", otherwise the folder's direct notes. */
export function selectNotes(allNotes: Note[], selection: FolderSelection): Note[] {
  if (selection === ALL_NOTES_ID) return allNotes
  return allNotes.filter((note) => note.folderId === selection)
}

/**
 * Notes for the current folder selection, derived synchronously from the shared
 * {@link useAllNotes} result so a selection change never shows a stale list.
 */
export function useNotes(allNotes: Note[] | undefined, selection: FolderSelection): Note[] | undefined {
  return useMemo(() => (allNotes ? selectNotes(allNotes, selection) : undefined), [allNotes, selection])
}

/** Number of direct notes per folder id (`null` = unfiled). */
export function countNotesByFolder(notes: Note[]): ReadonlyMap<string | null, number> {
  const counts = new Map<string | null, number>()
  for (const note of notes) counts.set(note.folderId, (counts.get(note.folderId) ?? 0) + 1)
  return counts
}
