import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { buildFolderTree, db, type FolderTreeNode } from '../db/db'
import type { Folder } from '../types'

export interface FoldersState {
  /** All folders, or `undefined` while the first query is in flight. */
  folders: Folder[] | undefined
  /** Nested, name-sorted folder tree (empty while loading). */
  tree: FolderTreeNode[]
  /** Folder lookup by id. */
  byId: ReadonlyMap<string, Folder>
}

const NO_FOLDERS: Folder[] = []

/** Live view of the folder table, as a flat list, a tree and an id lookup. */
export function useFolders(): FoldersState {
  const folders = useLiveQuery(() => db.folders.toArray(), [])
  const known = folders ?? NO_FOLDERS
  const tree = useMemo(() => buildFolderTree(known), [known])
  const byId = useMemo(() => new Map(known.map((folder) => [folder.id, folder])), [known])
  return useMemo(() => ({ folders, tree, byId }), [folders, tree, byId])
}
