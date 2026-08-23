import type { JSONContent } from '@tiptap/core'
import { useRef, useState, type ReactElement } from 'react'
import type { FolderTreeNode } from '../db/db'
import { NoteEditor } from '../editor/NoteEditor'
import type { SaveHandler } from '../editor/useAutosave'
import { MOD_KEY_LABEL } from '../hooks/useAppShortcuts'
import { formatLongDate } from '../lib/formatDate'
import type { Note } from '../types'
import { EmptyState } from './EmptyState'
import { MoveIcon, TrashIcon } from './Icons'
import { MoveNoteMenu } from './MoveNoteMenu'

export interface EditorPaneProps {
  /** The open note, or `null` for the empty state. */
  note: Note | null
  /** Focus the editor when it mounts (used right after creating a note). */
  autofocus: boolean
  tree: FolderTreeNode[]
  onSave: SaveHandler
  onMove: (noteId: string, folderId: string | null) => void
  onRequestDelete: (note: Note) => void
}

interface NoteEditorHostProps {
  note: Note
  autofocus: boolean
  onSave: SaveHandler
}

/**
 * Captures the note content once per mount so later live-query updates (our
 * own saves) never feed back into the editor. Remounted per note via `key`.
 */
function NoteEditorHost({ note, autofocus, onSave }: NoteEditorHostProps): ReactElement {
  const [initialContent] = useState<JSONContent>(() => note.content)
  return <NoteEditor noteId={note.id} initialContent={initialContent} onSave={onSave} autofocus={autofocus} />
}

/** Right pane: note header (date, Move to…, Delete) and the editor, or an empty state. */
export function EditorPane({ note, autofocus, tree, onSave, onMove, onRequestDelete }: EditorPaneProps): ReactElement {
  const [moveMenuOpen, setMoveMenuOpen] = useState(false)
  const moveRef = useRef<HTMLDivElement>(null)

  if (!note) {
    return (
      <section className="pane editor-pane" aria-label="Editor">
        <EmptyState title="No note selected" hint={`Create a note with ${MOD_KEY_LABEL}N`} />
      </section>
    )
  }

  return (
    <section className="pane editor-pane" aria-label="Editor">
      <header className="pane-header editor-header">
        <span className="editor-date">{formatLongDate(note.updatedAt)}</span>
        <div className="editor-header-actions">
          <div className="editor-move" ref={moveRef}>
            <button
              type="button"
              className="icon-button"
              aria-label="Move to…"
              title="Move to…"
              aria-haspopup="menu"
              aria-expanded={moveMenuOpen}
              onClick={() => setMoveMenuOpen((open) => !open)}
            >
              <MoveIcon />
            </button>
            {moveMenuOpen && (
              <MoveNoteMenu
                tree={tree}
                currentFolderId={note.folderId}
                onMove={(folderId) => onMove(note.id, folderId)}
                onClose={() => setMoveMenuOpen(false)}
                boundaryRef={moveRef}
              />
            )}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Delete note"
            title="Delete note"
            onClick={() => onRequestDelete(note)}
          >
            <TrashIcon />
          </button>
        </div>
      </header>
      <div className="editor-body">
        <NoteEditorHost key={note.id} note={note} autofocus={autofocus} onSave={onSave} />
      </div>
    </section>
  )
}
