import type { ReactElement, RefObject } from 'react'
import type { FolderTreeNode } from '../db/db'
import type { Note } from '../types'
import { EmptyState } from './EmptyState'
import { ComposeIcon, SidebarIcon } from './Icons'
import { noteOptionId, useNoteListNavigation } from '../hooks/useNoteListNavigation'
import { NoteListItem } from './NoteListItem'
import { SearchBar } from './SearchBar'

export interface NoteListProps {
  /** Header title: the folder name, "All Notes" or "Search results". */
  title: string
  /** Notes to show, already ordered. `undefined` while loading. */
  notes: Note[] | undefined
  selectedNoteId: string | null
  query: string
  onQueryChange: (query: string) => void
  searchInputRef: RefObject<HTMLInputElement | null>
  /** Matched terms per note id; present only while showing search results. */
  hitTerms?: ReadonlyMap<string, string[]>
  /** Folder name for a note, used for the breadcrumb on search results. */
  folderNameOf: (note: Note) => string
  tree: FolderTreeNode[]
  onSelect: (noteId: string) => void
  onCreateNote: () => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  onMove: (noteId: string, folderId: string | null) => void
  onRequestDelete: (note: Note) => void
}

/** Middle pane: search bar, header with "New note", and the keyboard-navigable list of notes. */
export function NoteList({
  title,
  notes,
  selectedNoteId,
  query,
  onQueryChange,
  searchInputRef,
  hitTerms,
  folderNameOf,
  tree,
  onSelect,
  onCreateNote,
  sidebarCollapsed,
  onToggleSidebar,
  onMove,
  onRequestDelete,
}: NoteListProps): ReactElement {
  const searching = hitTerms !== undefined
  const { listRef, onKeyDown } = useNoteListNavigation(notes, selectedNoteId, onSelect)

  return (
    <section className="pane note-list-pane" aria-label="Notes">
      <header className="pane-header">
        <button
          type="button"
          className="icon-button"
          aria-label={sidebarCollapsed ? 'Show folders' : 'Hide folders'}
          title={sidebarCollapsed ? 'Show folders' : 'Hide folders'}
          aria-pressed={sidebarCollapsed}
          onClick={onToggleSidebar}
        >
          <SidebarIcon />
        </button>
        <h2 className="pane-title note-list-title">{title}</h2>
        <button type="button" className="icon-button" aria-label="New note" title="New note" onClick={onCreateNote}>
          <ComposeIcon />
        </button>
      </header>
      <SearchBar value={query} onChange={onQueryChange} inputRef={searchInputRef} />
      <div className="pane-scroll">
        {notes && notes.length === 0 ? (
          <EmptyState title={searching ? 'No results' : 'No notes'} hint={searching ? undefined : 'Create a note to get started'} />
        ) : (
          <ul
            ref={listRef}
            role="listbox"
            aria-label={title}
            aria-activedescendant={selectedNoteId ? noteOptionId(selectedNoteId) : undefined}
            tabIndex={0}
            className="note-list"
            onKeyDown={onKeyDown}
          >
            {(notes ?? []).map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                selected={note.id === selectedNoteId}
                highlightTerms={hitTerms?.get(note.id)}
                breadcrumb={searching ? folderNameOf(note) : undefined}
                tree={tree}
                onSelect={onSelect}
                onMove={onMove}
                onRequestDelete={onRequestDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
