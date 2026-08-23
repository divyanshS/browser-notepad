import { useState, type DragEvent, type ReactElement } from 'react'
import type { FolderTreeNode } from '../db/db'
import { NOTE_DRAG_TYPE } from '../hooks/useNoteDropTarget'
import { noteOptionId } from '../hooks/useNoteListNavigation'
import { formatNoteDate } from '../lib/formatDate'
import { deriveSnippet } from '../lib/noteText'
import { highlightText } from '../search/highlight'
import type { Note } from '../types'
import { ActionMenu } from './ActionMenu'
import { MoveNoteMenu } from './MoveNoteMenu'

export interface NoteListItemProps {
  note: Note
  selected: boolean
  /** Matched search terms to highlight, when the list shows search results. */
  highlightTerms?: string[]
  /** Folder name shown as a breadcrumb on search results. */
  breadcrumb?: string
  tree: FolderTreeNode[]
  onSelect: (noteId: string) => void
  onMove: (noteId: string, folderId: string | null) => void
  onRequestDelete: (note: Note) => void
}

const NO_TERMS: string[] = []

/** One row of the note list: title, date, snippet, breadcrumb and the ⋯ menu. Draggable onto folders. */
export function NoteListItem({
  note,
  selected,
  highlightTerms = NO_TERMS,
  breadcrumb,
  tree,
  onSelect,
  onMove,
  onRequestDelete,
}: NoteListItemProps): ReactElement {
  const [moveMenuOpen, setMoveMenuOpen] = useState(false)
  const snippet = deriveSnippet(note.text)

  const onDragStart = (event: DragEvent<HTMLLIElement>) => {
    event.dataTransfer.setData(NOTE_DRAG_TYPE, note.id)
    event.dataTransfer.effectAllowed = 'move'
  }

  const menuActions = [
    { id: 'move', label: 'Move to…', onSelect: () => setMoveMenuOpen(true) },
    { id: 'delete', label: 'Delete', destructive: true, onSelect: () => onRequestDelete(note) },
  ]

  return (
    <li
      id={noteOptionId(note.id)}
      role="option"
      aria-selected={selected}
      className={`note-item${selected ? ' is-selected' : ''}`}
      draggable
      onDragStart={onDragStart}
      onClick={() => onSelect(note.id)}
    >
      <div className="note-item-title">{highlightText(note.title, highlightTerms)}</div>
      <div className="note-item-meta">
        <time className="note-item-date" dateTime={new Date(note.updatedAt).toISOString()}>
          {formatNoteDate(note.updatedAt)}
        </time>
        <span className="note-item-snippet">{snippet ? highlightText(snippet, highlightTerms) : 'No additional text'}</span>
      </div>
      {breadcrumb !== undefined && <div className="note-item-breadcrumb">{breadcrumb}</div>}
      <ActionMenu label={`Actions for ${note.title}`} actions={menuActions} className="note-item-menu" />
      {moveMenuOpen && (
        <MoveNoteMenu
          tree={tree}
          currentFolderId={note.folderId}
          onMove={(folderId) => onMove(note.id, folderId)}
          onClose={() => setMoveMenuOpen(false)}
        />
      )}
    </li>
  )
}
