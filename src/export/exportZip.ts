import type { Folder, Note } from '../types'
import { serializeToMarkdown } from '../markdown/serialize'

/** What to export. `rootFolderId` undefined/null exports the whole library. */
export interface ExportInput {
  folders: Folder[]
  notes: Note[]
  /** Export only this folder's subtree, with the folder itself as the zip's top-level directory. */
  rootFolderId?: string | null
}

/** One Markdown file inside the zip. `path` uses POSIX separators and ends with `.md`. */
export interface ExportPlanEntry {
  path: string
  noteId: string
}

interface PlannedFile {
  path: string
  note: Note
}

/** Full layout of the zip: every directory (trailing `/`) plus every file. */
interface ExportLayout {
  directories: string[]
  files: PlannedFile[]
}

/** Lookup tables over the library; `null` keys hold top-level folders and unfiled notes. */
interface LibraryIndex {
  foldersById: Map<string, Folder>
  childFolders: Map<string | null, Folder[]>
  notesByFolder: Map<string | null, Note[]>
}

const FOLDER_NAME_FALLBACK = 'Untitled Folder'
const NOTE_NAME_FALLBACK = 'Untitled'
const LIBRARY_EXPORT_STEM = 'notes-export'
const MARKDOWN_EXTENSION = '.md'
const MAX_FILE_NAME_LENGTH = 80
const DEFLATE_LEVEL = 6
const REVOKE_URL_DELAY_MS = 1000

/** Path separators, Windows-reserved punctuation and Unicode control characters (C0, DEL, C1). */
const ILLEGAL_FILE_NAME_CHARS = /[\\/:*?"<>|\p{Cc}]/gu
/** Windows device names that are invalid as a file or directory name, with or without an extension. */
const WINDOWS_RESERVED_NAMES = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i

/**
 * Computes the zip layout for an export without touching JSZip.
 *
 * Whole-library export: unfiled notes at the root, every top-level folder (including
 * orphans whose parent is missing) a directory, nested folders nested directories.
 * Per-folder export: the zip's only top-level directory is that folder; notes outside
 * its subtree are excluded. Directory and file names are sanitized and de-duplicated
 * (case-insensitively, with ` (2)`, ` (3)`… suffixes) among all entries of the same
 * directory. Folders are ordered by name, notes by `updatedAt` descending, so suffixes
 * land on the older notes. Throws when `rootFolderId` names a folder that does not exist.
 */
export function planExport(input: ExportInput): ExportPlanEntry[] {
  return planLayout(input).files.map(({ path, note }) => ({ path, noteId: note.id }))
}

/**
 * Builds the export zip (DEFLATE-compressed) as raw bytes.
 * Empty folders are still written as directory entries.
 */
export async function buildExportZipData(input: ExportInput): Promise<Uint8Array> {
  const layout = planLayout(input)
  // JSZip is only needed when exporting, so it is loaded on demand to keep it out of the initial bundle.
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const directory of layout.directories) zip.folder(directory)
  for (const { path, note } of layout.files) zip.file(path, serializeToMarkdown(note.content))
  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: DEFLATE_LEVEL },
  })
}

/** Builds the export zip as a `Blob` of type `application/zip`, ready for {@link downloadBlob}. */
export async function buildExportZip(input: ExportInput): Promise<Blob> {
  const data = await buildExportZipData(input)
  // JSZip types its output as `Uint8Array<ArrayBufferLike>`; at runtime it is always ArrayBuffer-backed.
  return new Blob([data as BlobPart], { type: 'application/zip' })
}

/**
 * Makes a string safe to use as a single file or directory name on every platform:
 * strips `/ \ : * ? " < > |` and control characters, trims leading/trailing dots and
 * whitespace, caps the length at 80 code points, prefixes Windows-reserved device names
 * (`CON`, `NUL`, `COM1`…) with `_`, and returns `fallback` when nothing is left.
 */
export function sanitizeFileName(name: string, fallback: string): string {
  const stripped = trimDotsAndSpaces(name.replace(ILLEGAL_FILE_NAME_CHARS, ''))
  const truncated = trimDotsAndSpaces(Array.from(stripped).slice(0, MAX_FILE_NAME_LENGTH).join(''))
  if (truncated === '') return fallback
  return WINDOWS_RESERVED_NAMES.test(truncated) ? `_${truncated}` : truncated
}

/**
 * Suggested download name: `notes-export-YYYY-MM-DD.zip` for the whole library or
 * `<sanitized folder name>-YYYY-MM-DD.zip` for a single folder (local date).
 */
export function exportFileName(folder?: Folder | null, now: Date = new Date()): string {
  const stem = folder ? sanitizeFileName(folder.name, FOLDER_NAME_FALLBACK) : LIBRARY_EXPORT_STEM
  return `${stem}-${formatLocalDate(now)}.zip`
}

/**
 * Triggers a browser download of `blob` under `fileName` via a temporary object URL and
 * `<a download>` click. The URL is revoked shortly afterwards so the download can start first.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_URL_DELAY_MS)
}

// ---------------------------------------------------------------------------
// Layout planning
// ---------------------------------------------------------------------------

function planLayout(input: ExportInput): ExportLayout {
  const index = indexLibrary(input.folders, input.notes)
  const layout: ExportLayout = { directories: [], files: [] }
  const rootId = input.rootFolderId ?? null
  if (rootId === null) {
    addDirectoryContents(layout, index, null, '', new Set())
    return layout
  }
  const root = index.foldersById.get(rootId)
  if (!root) throw new Error(`Cannot export folder "${rootId}": it does not exist`)
  addFolder(layout, index, root, '', new Set(), new Set())
  return layout
}

/** Adds a folder as a directory under `parentPath`, then recurses into its contents. */
function addFolder(
  layout: ExportLayout,
  index: LibraryIndex,
  folder: Folder,
  parentPath: string,
  takenInParent: Set<string>,
  visited: Set<string>,
): void {
  if (visited.has(folder.id)) return
  visited.add(folder.id)
  const name = uniqueName(sanitizeFileName(folder.name, FOLDER_NAME_FALLBACK), '', takenInParent)
  const path = `${parentPath}${name}/`
  layout.directories.push(path)
  addDirectoryContents(layout, index, folder.id, path, visited)
}

/** Adds the notes of `folderId` (files) and then its child folders (directories) under `dirPath`. */
function addDirectoryContents(
  layout: ExportLayout,
  index: LibraryIndex,
  folderId: string | null,
  dirPath: string,
  visited: Set<string>,
): void {
  const taken = new Set<string>()
  for (const note of index.notesByFolder.get(folderId) ?? []) {
    const name = uniqueName(sanitizeFileName(note.title, NOTE_NAME_FALLBACK), MARKDOWN_EXTENSION, taken)
    layout.files.push({ path: dirPath + name, note })
  }
  for (const child of index.childFolders.get(folderId) ?? []) {
    addFolder(layout, index, child, dirPath, taken, visited)
  }
}

/** Returns `base + extension`, or `base (n)extension` for the first free `n ≥ 2`, and reserves it. */
function uniqueName(base: string, extension: string, taken: Set<string>): string {
  let candidate = base + extension
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${base} (${n})${extension}`
  taken.add(candidate.toLowerCase())
  return candidate
}

/**
 * Groups folders by parent and notes by folder, sorted for stable output. Folders whose
 * parent is missing count as top-level; notes whose folder is missing count as unfiled.
 */
function indexLibrary(folders: Folder[], notes: Note[]): LibraryIndex {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]))
  const existingId = (id: string | null): string | null => (id !== null && foldersById.has(id) ? id : null)
  const childFolders = groupBy(sortFolders(folders), (folder) => existingId(folder.parentId))
  const notesByFolder = groupBy(sortNotes(notes), (note) => existingId(note.folderId))
  return { foldersById, childFolders, notesByFolder }
}

function sortFolders(folders: Folder[]): Folder[] {
  return [...folders].sort(
    (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id),
  )
}

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id))
}

function groupBy<T, K>(items: T[], keyOf: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return groups
}

// ---------------------------------------------------------------------------
// Name helpers
// ---------------------------------------------------------------------------

function trimDotsAndSpaces(name: string): string {
  return name.replace(/^[\s.]+|[\s.]+$/g, '')
}

function formatLocalDate(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
