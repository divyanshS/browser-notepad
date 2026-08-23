import type { JSONContent } from '@tiptap/core'

/** A user-created folder. Folders may be nested via `parentId`. */
export interface Folder {
  id: string
  name: string
  /** `null` for a top-level folder. */
  parentId: string | null
  createdAt: number
  updatedAt: number
}

/** A note. `folderId === null` means "unfiled" (visible only under "All Notes"). */
export interface Note {
  id: string
  folderId: string | null
  /** Derived from the first non-empty line of `text`; "New Note" when empty. */
  title: string
  /** Plain-text projection of `content`, used for search, snippets and title derivation. */
  text: string
  /** Tiptap/ProseMirror document JSON — the source of truth for the editor. */
  content: JSONContent
  createdAt: number
  updatedAt: number
}

/** Sentinel id for the virtual "All Notes" folder in the left pane. */
export const ALL_NOTES_ID = 'all' as const
export type FolderSelection = typeof ALL_NOTES_ID | string
