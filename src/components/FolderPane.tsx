import type { ReactElement } from 'react'
import type { FolderTreeNode } from '../db/db'
import { useNoteDropTarget } from '../hooks/useNoteDropTarget'
import { ALL_NOTES_ID, type FolderSelection } from '../types'
import { FolderTreeItem, type FolderActions } from './FolderTreeItem'
import type { Theme } from '../hooks/useTheme'
import { ExportIcon, NewFolderIcon, NotesIcon } from './Icons'
import { ThemePicker } from './ThemePicker'

export interface FolderPaneProps {
  tree: FolderTreeNode[]
  selection: FolderSelection
  expanded: ReadonlySet<string>
  renamingId: string | null
  /** Direct note count per folder id; `null` = unfiled. */
  counts: ReadonlyMap<string | null, number>
  /** Total number of notes (shown next to "All Notes"). */
  totalCount: number
  actions: FolderActions
  onSelectAllNotes: () => void
  onCreateFolder: () => void
  onExportAll: () => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  /** A note was dropped onto "All Notes" (unfile it). */
  onUnfileNote: (noteId: string) => void
}

/** Left pane: "All Notes", the folder tree, New Folder and Export all. */
export function FolderPane({
  tree,
  selection,
  expanded,
  renamingId,
  counts,
  totalCount,
  actions,
  onSelectAllNotes,
  onCreateFolder,
  onExportAll,
  theme,
  onThemeChange,
  onUnfileNote,
}: FolderPaneProps): ReactElement {
  const allSelected = selection === ALL_NOTES_ID
  const { dropActive, dropProps } = useNoteDropTarget(onUnfileNote)

  return (
    <aside className="pane folder-pane" aria-label="Folders">
      <header className="pane-header">
        <h1 className="pane-title">Folders</h1>
        <button type="button" className="icon-button" aria-label="New Folder" title="New Folder" onClick={onCreateFolder}>
          <NewFolderIcon />
        </button>
      </header>
      <nav className="pane-scroll">
        <ul role="tree" aria-label="Folders" className="folder-tree">
          <li role="none" className="folder-item">
            <div
              role="treeitem"
              aria-level={1}
              aria-selected={allSelected}
              tabIndex={0}
              className={`folder-row all-notes-row${allSelected ? ' is-selected' : ''}`}
              data-drop-active={dropActive || undefined}
              onClick={onSelectAllNotes}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onSelectAllNotes()
              }}
              {...dropProps}
            >
              <NotesIcon className="folder-row-icon" />
              <span className="folder-row-name">All Notes</span>
              <span className="folder-row-count" aria-label={`${totalCount} notes`}>
                {totalCount}
              </span>
            </div>
          </li>
          {tree.map((node) => (
            <FolderTreeItem
              key={node.folder.id}
              node={node}
              depth={0}
              selectedId={allSelected ? null : selection}
              expanded={expanded}
              renamingId={renamingId}
              counts={counts}
              actions={actions}
            />
          ))}
        </ul>
      </nav>
      <footer className="pane-footer">
        <p className="storage-notice" role="note">
          Notes are stored only in this browser. Clearing site data or browsing history deletes them — export regularly.
        </p>
        <ThemePicker theme={theme} onChange={onThemeChange} />
        <button type="button" className="button footer-button" onClick={onExportAll}>
          <ExportIcon />
          Export all
        </button>
      </footer>
    </aside>
  )
}
