import { useEffect, useRef, type ReactElement, type RefObject } from 'react'
import type { FolderTreeNode } from '../db/db'
import { useDismissable } from '../hooks/useDismissable'
import { useMenuNavigation } from '../hooks/useMenuNavigation'
import { CheckIcon } from './Icons'

export interface MoveNoteMenuProps {
  tree: FolderTreeNode[]
  /** Folder the note currently lives in (`null` = unfiled). */
  currentFolderId: string | null
  /** Called with the chosen destination (`null` = "All Notes", i.e. unfile). */
  onMove: (folderId: string | null) => void
  onClose: () => void
  /**
   * Element whose inside clicks must not dismiss the menu (e.g. a wrapper that
   * also contains the toggle button). Defaults to the menu itself.
   */
  boundaryRef?: RefObject<HTMLElement | null>
}

interface FlatFolder {
  id: string
  name: string
  depth: number
}

/** Depth-first flattening of the folder tree for an indented single-column list. */
function flattenTree(nodes: FolderTreeNode[], depth = 0, out: FlatFolder[] = []): FlatFolder[] {
  for (const node of nodes) {
    out.push({ id: node.folder.id, name: node.folder.name, depth })
    flattenTree(node.children, depth + 1, out)
  }
  return out
}

const ITEM_SELECTOR = '[role="menuitemradio"]'
const INDENT_PX = 16

/**
 * Popover listing every folder (indented by depth) plus "All Notes (unfiled)".
 * Picking an entry moves the note there and closes the menu.
 */
export function MoveNoteMenu({ tree, currentFolderId, onMove, onClose, boundaryRef }: MoveNoteMenuProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null)
  useDismissable(boundaryRef ?? rootRef, true, onClose)
  const onKeyDown = useMenuNavigation(ITEM_SELECTOR)

  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus()
  }, [])

  const entries: FlatFolder[] = [{ id: '', name: 'All Notes (unfiled)', depth: 0 }, ...flattenTree(tree)]

  const choose = (folderId: string | null) => {
    onClose()
    if (folderId !== currentFolderId) onMove(folderId)
  }

  return (
    <div
      ref={rootRef}
      className="popover-menu move-note-menu"
      role="menu"
      aria-label="Move to folder"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={onKeyDown}
    >
      <div className="popover-menu-heading">Move to…</div>
      {entries.map((entry) => {
        const folderId = entry.id === '' ? null : entry.id
        const isCurrent = folderId === currentFolderId
        return (
          <button
            key={entry.id}
            type="button"
            role="menuitemradio"
            aria-checked={isCurrent}
            className="popover-menu-item move-note-menu-item"
            style={{ paddingLeft: `${12 + entry.depth * INDENT_PX}px` }}
            onClick={() => choose(folderId)}
          >
            <span className="move-note-menu-check">{isCurrent && <CheckIcon />}</span>
            <span className="move-note-menu-label">{entry.name}</span>
          </button>
        )
      })}
    </div>
  )
}
