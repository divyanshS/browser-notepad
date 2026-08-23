import Dexie, { type EntityTable } from 'dexie'
import type { JSONContent } from '@tiptap/core'
import type { Folder, Note } from '../types'
import { DEFAULT_TITLE, deriveTitle, newId } from '../lib/noteText'
import { welcomeNoteContent, welcomeNoteText } from './welcomeNote'

/** Small key/value store for app-level flags (e.g. whether the welcome note was seeded). */
export interface MetaEntry {
  key: string
  value: string
}

/** A folder with its (sorted) child folders, as produced by {@link buildFolderTree}. */
export interface FolderTreeNode {
  folder: Folder
  children: FolderTreeNode[]
}

/** Name given to folders created with a blank name. */
export const UNTITLED_FOLDER_NAME = 'Untitled Folder'

/** Key in `meta` marking that the first-launch seeding decision has been made. */
const SEEDED_KEY = 'seeded'

/** Empty Tiptap document used for freshly created notes. */
const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

type NotepadDatabase = Dexie & {
  folders: EntityTable<Folder, 'id'>
  notes: EntityTable<Note, 'id'>
  meta: EntityTable<MetaEntry, 'key'>
}

/** The app's IndexedDB database. Tables: `folders`, `notes`, `meta`. */
export const db = new Dexie('browser-notepad') as NotepadDatabase

db.version(1).stores({
  folders: 'id, parentId, name',
  notes: 'id, folderId, updatedAt',
  meta: 'key',
})

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

/** Creates a folder. The name is trimmed; a blank name becomes "Untitled Folder". */
export async function createFolder(name: string, parentId: string | null = null): Promise<Folder> {
  const now = Date.now()
  const folder: Folder = {
    id: newId(),
    name: name.trim() || UNTITLED_FOLDER_NAME,
    parentId,
    createdAt: now,
    updatedAt: now,
  }
  await db.folders.add(folder)
  return folder
}

/** Renames a folder. The name is trimmed; a blank name is ignored. */
export async function renameFolder(id: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (trimmed.length === 0) return
  await db.folders.update(id, { name: trimmed, updatedAt: Date.now() })
}

/**
 * Deletes a folder and all of its descendant folders. Notes inside any of them
 * are unfiled (`folderId = null`), never deleted. Runs in a single transaction.
 */
export async function deleteFolder(id: string): Promise<void> {
  await db.transaction('rw', db.folders, db.notes, async () => {
    const folders = await db.folders.toArray()
    const ids = [...collectDescendantFolderIds(id, folders)]
    await db.notes.where('folderId').anyOf(ids).modify({ folderId: null })
    await db.folders.bulkDelete(ids)
  })
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

/** Creates an empty note in the given folder (`null` = unfiled). */
export async function createNote(folderId: string | null): Promise<Note> {
  const now = Date.now()
  const note: Note = {
    id: newId(),
    folderId,
    title: DEFAULT_TITLE,
    text: '',
    content: EMPTY_DOC,
    createdAt: now,
    updatedAt: now,
  }
  await db.notes.add(note)
  return note
}

/**
 * Stores new editor content for a note, re-deriving its title and bumping
 * `updatedAt`. A no-op when the note no longer exists (it is never re-created).
 */
export async function saveNoteContent(id: string, content: JSONContent, text: string): Promise<void> {
  await db.notes.update(id, { content, text, title: deriveTitle(text), updatedAt: Date.now() })
}

/** Moves a note to a folder (`null` = unfile). Bumps `updatedAt`. */
export async function moveNote(id: string, folderId: string | null): Promise<void> {
  await db.notes.update(id, { folderId, updatedAt: Date.now() })
}

/** Permanently deletes a note. */
export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id)
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/** Builds the unfiled welcome note inserted on first launch. */
function buildWelcomeNote(now: number): Note {
  return {
    id: newId(),
    folderId: null,
    title: deriveTitle(welcomeNoteText),
    text: welcomeNoteText,
    content: welcomeNoteContent,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Inserts the welcome note on first launch (no `seeded` flag and no notes), then
 * records the `seeded` flag so it never runs again. The check and the insert
 * share one read-write transaction, so concurrent invocations (e.g. React
 * StrictMode's double effects) are serialized and seed at most once.
 */
export async function seedWelcomeNoteIfEmpty(): Promise<void> {
  await db.transaction('rw', db.notes, db.meta, async () => {
    const seeded = await db.meta.get(SEEDED_KEY)
    if (seeded !== undefined) return
    const count = await db.notes.count()
    if (count === 0) {
      await db.notes.add(buildWelcomeNote(Date.now()))
    }
    await db.meta.put({ key: SEEDED_KEY, value: '1' })
  })
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Groups folders by their `parentId`. */
function groupByParent(folders: Folder[]): Map<string | null, Folder[]> {
  const byParent = new Map<string | null, Folder[]>()
  for (const folder of folders) {
    const siblings = byParent.get(folder.parentId)
    if (siblings) siblings.push(folder)
    else byParent.set(folder.parentId, [folder])
  }
  return byParent
}

/**
 * Returns the ids of `rootId` and every folder nested below it (any depth).
 * Pure: operates on the given folder list only.
 */
export function collectDescendantFolderIds(rootId: string, folders: Folder[]): Set<string> {
  const byParent = groupByParent(folders)
  const ids = new Set<string>([rootId])
  const queue = [rootId]
  while (queue.length > 0) {
    const parentId = queue.shift() as string
    for (const child of byParent.get(parentId) ?? []) {
      if (ids.has(child.id)) continue
      ids.add(child.id)
      queue.push(child.id)
    }
  }
  return ids
}

/** Natural, case-insensitive name ordering ("Notes 2" before "Notes 10"). */
function compareByName(a: Folder, b: Folder): number {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Builds the nested folder tree, sorted by name at every level. Folders whose
 * parent is missing are treated as top-level.
 */
export function buildFolderTree(folders: Folder[]): FolderTreeNode[] {
  const byParent = groupByParent(folders)
  const known = new Set(folders.map((folder) => folder.id))
  const roots = folders.filter((folder) => folder.parentId === null || !known.has(folder.parentId))

  const build = (folder: Folder): FolderTreeNode => ({
    folder,
    children: (byParent.get(folder.id) ?? []).sort(compareByName).map(build),
  })

  return roots.sort(compareByName).map(build)
}
