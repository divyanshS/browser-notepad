import { useRef, type ReactElement } from 'react'
import type { FolderTreeNode } from '../db/db'
import { useNoteDropTarget } from '../hooks/useNoteDropTarget'
import { ActionMenu } from './ActionMenu'
import { ChevronIcon, FolderIcon } from './Icons'

/** Callbacks shared by every row of the folder tree. */
export interface FolderActions {
  onSelect: (folderId: string) => void
  onToggleExpanded: (folderId: string) => void
  onStartRename: (folderId: string) => void
  /** Commits a rename; an unchanged or blank name is ignored by the caller. */
  onRenameCommit: (folderId: string, name: string) => void
  onRenameCancel: () => void
  onCreateSubfolder: (folderId: string) => void
  onExport: (folderId: string) => void
  onRequestDelete: (folderId: string) => void
  /** A note was dropped onto the folder. */
  onDropNote: (noteId: string, folderId: string) => void
}

export interface FolderTreeItemProps {
  node: FolderTreeNode
  depth: number
  selectedId: string | null
  expanded: ReadonlySet<string>
  /** Id of the folder currently being renamed inline, if any. */
  renamingId: string | null
  /** Direct note count per folder id. */
  counts: ReadonlyMap<string | null, number>
  actions: FolderActions
}

const INDENT_PX = 14

/** Enter and Space activate a focused tree row. */
function selectOnKey(key: string): boolean {
  return key === 'Enter' || key === ' '
}

interface RenameInputProps {
  initialName: string
  onCommit: (name: string) => void
  onCancel: () => void
}

/** Selects the whole name when the rename field mounts. */
function selectContents(input: HTMLInputElement | null): void {
  input?.select()
}

/** Inline rename field: Enter/blur commit, Escape cancels. */
function RenameInput({ initialName, onCommit, onCancel }: RenameInputProps): ReactElement {
  const doneRef = useRef(false)

  const finish = (commit: boolean, value: string) => {
    if (doneRef.current) return
    doneRef.current = true
    if (commit) onCommit(value)
    else onCancel()
  }

  return (
    <input
      className="folder-rename-input"
      aria-label="Folder name"
      defaultValue={initialName}
      ref={selectContents}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          finish(true, event.currentTarget.value)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          finish(false, '')
        }
      }}
      onBlur={(event) => finish(true, event.currentTarget.value)}
    />
  )
}

/** One folder row plus, when expanded, its children. */
export function FolderTreeItem({
  node,
  depth,
  selectedId,
  expanded,
  renamingId,
  counts,
  actions,
}: FolderTreeItemProps): ReactElement {
  const { folder, children } = node
  const isExpanded = expanded.has(folder.id)
  const isSelected = selectedId === folder.id
  const hasChildren = children.length > 0
  const { dropActive, dropProps } = useNoteDropTarget((noteId) => actions.onDropNote(noteId, folder.id))
  const count = counts.get(folder.id) ?? 0

  const menuActions = [
    { id: 'subfolder', label: 'New Subfolder', onSelect: () => actions.onCreateSubfolder(folder.id) },
    { id: 'rename', label: 'Rename', onSelect: () => actions.onStartRename(folder.id) },
    { id: 'export', label: 'Export Folder…', onSelect: () => actions.onExport(folder.id) },
    { id: 'delete', label: 'Delete', destructive: true, onSelect: () => actions.onRequestDelete(folder.id) },
  ]

  return (
    <li role="none" className="folder-item">
      <div
        role="treeitem"
        aria-level={depth + 1}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        tabIndex={0}
        className={`folder-row${isSelected ? ' is-selected' : ''}`}
        style={{ paddingLeft: `${8 + depth * INDENT_PX}px` }}
        data-drop-active={dropActive || undefined}
        onClick={() => actions.onSelect(folder.id)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !selectOnKey(event.key)) return
          event.preventDefault()
          actions.onSelect(folder.id)
        }}
        onDoubleClick={() => actions.onStartRename(folder.id)}
        {...dropProps}
      >
        <button
          type="button"
          className={`icon-button folder-chevron${isExpanded ? ' is-expanded' : ''}`}
          aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          aria-hidden={!hasChildren}
          tabIndex={hasChildren ? 0 : -1}
          disabled={!hasChildren}
          onClick={(event) => {
            event.stopPropagation()
            actions.onToggleExpanded(folder.id)
          }}
        >
          <ChevronIcon />
        </button>
        <FolderIcon className="folder-row-icon" />
        {renamingId === folder.id ? (
          <RenameInput
            initialName={folder.name}
            onCommit={(name) => actions.onRenameCommit(folder.id, name)}
            onCancel={actions.onRenameCancel}
          />
        ) : (
          <span className="folder-row-name">{folder.name}</span>
        )}
        <span className="folder-row-count" aria-label={`${count} notes`}>
          {count}
        </span>
        <ActionMenu label={`Actions for ${folder.name}`} actions={menuActions} className="folder-row-menu" />
      </div>
      {hasChildren && isExpanded && (
        <ul role="group" className="folder-group">
          {children.map((child) => (
            <FolderTreeItem
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              renamingId={renamingId}
              counts={counts}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
