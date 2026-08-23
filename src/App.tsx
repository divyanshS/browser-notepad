import type { ReactElement } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSidebarCollapsed } from './hooks/useSidebarCollapsed'
import { useTheme } from './hooks/useTheme'
import { ConfirmDialog } from './components/ConfirmDialog'
import { EditorPane } from './components/EditorPane'
import { FolderPane } from './components/FolderPane'
import type { FolderActions } from './components/FolderTreeItem'
import { NoteList } from './components/NoteList'
import {
  collectDescendantFolderIds,
  createFolder,
  createNote,
  db,
  deleteFolder,
  deleteNote,
  moveNote,
  renameFolder,
  saveNoteContent,
  seedWelcomeNoteIfEmpty,
} from './db/db'
import { buildExportZip, downloadBlob, exportFileName } from './export/exportZip'
import { useAppShortcuts, type AppShortcutHandlers } from './hooks/useAppShortcuts'
import { useExpandedFolders } from './hooks/useExpandedFolders'
import { useFolders } from './hooks/useFolders'
import { countNotesByFolder, useAllNotes } from './hooks/useNotes'
import { useSelection } from './hooks/useSelection'
import { useNotesSearch } from './search/useNotesSearch'
import { ALL_NOTES_ID, type Folder, type Note } from './types'
import './styles/app.css'
import './styles/editor.css'

/** Name given to folders created from the UI; the inline rename field opens immediately. */
const NEW_FOLDER_NAME = 'New Folder'
const ALL_NOTES_LABEL = 'All Notes'

type PendingConfirm = { kind: 'note'; note: Note } | { kind: 'folder'; folder: Folder }

/** Picks the note to select after `noteId` is removed from `list`: the next one, else the previous. */
function nextNoteAfterRemoval(list: Note[], noteId: string): Note | undefined {
  const index = list.findIndex((note) => note.id === noteId)
  if (index === -1) return list[0]
  return list[index + 1] ?? list[index - 1]
}

/** Three-pane notes app: folders | note list + search | editor. */
export default function App(): ReactElement {
  const { folders, tree, byId } = useFolders()
  const allNotes = useAllNotes()
  const { folderSelection, selectedNoteId, notes, selectFolder, selectNote } = useSelection(allNotes)
  const expandedFolders = useExpandedFolders()

  const [query, setQuery] = useState('')
  const [theme, setTheme] = useTheme()
  const [sidebarCollapsed, toggleSidebar] = useSidebarCollapsed()
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const selectedNoteIdRef = useRef(selectedNoteId)
  useEffect(() => {
    selectedNoteIdRef.current = selectedNoteId
  }, [selectedNoteId])

  const search = useNotesSearch(allNotes, query)
  const searching = query.trim().length > 0

  const notesById = useMemo(() => new Map((allNotes ?? []).map((note) => [note.id, note])), [allNotes])
  const visibleNotes = useMemo(() => {
    if (!searching) return notes
    return search.hits.flatMap((hit) => notesById.get(hit.id) ?? [])
  }, [searching, notes, search.hits, notesById])
  const counts = useMemo(() => countNotesByFolder(allNotes ?? []), [allNotes])
  const selectedNote = (selectedNoteId && notesById.get(selectedNoteId)) || null
  const selectedFolder = folderSelection === ALL_NOTES_ID ? null : byId.get(folderSelection)

  // First launch: seed the welcome note, then open the most recent note if none is open yet.
  useEffect(() => {
    let cancelled = false
    void seedWelcomeNoteIfEmpty()
      .then(() => db.notes.orderBy('updatedAt').last())
      .then((latest) => {
        if (!cancelled && latest && selectedNoteIdRef.current === null) selectNote(latest.id)
      })
    return () => {
      cancelled = true
    }
  }, [selectNote])

  // Fall back to "All Notes" when a previously known selected folder disappears
  // (e.g. deleted from another tab). A just-created folder is not yet "known".
  const previousFoldersRef = useRef(byId)
  useEffect(() => {
    const previous = previousFoldersRef.current
    previousFoldersRef.current = byId
    if (folderSelection === ALL_NOTES_ID) return
    if (previous.has(folderSelection) && !byId.has(folderSelection)) selectFolder(ALL_NOTES_ID)
  }, [byId, folderSelection, selectFolder])

  const folderNameOf = useCallback(
    (note: Note) => (note.folderId && byId.get(note.folderId)?.name) || ALL_NOTES_LABEL,
    [byId],
  )

  /** Selecting an existing note never steals focus from the list. */
  const handleSelectNote = useCallback(
    (noteId: string) => {
      setFocusNoteId(null)
      selectNote(noteId)
    },
    [selectNote],
  )

  const handleCreateNote = useCallback(async () => {
    const note = await createNote(folderSelection === ALL_NOTES_ID ? null : folderSelection)
    setQuery('')
    setFocusNoteId(note.id)
    selectNote(note.id)
  }, [folderSelection, selectNote])

  const handleCreateFolder = useCallback(
    async (parentId: string | null) => {
      const folder = await createFolder(NEW_FOLDER_NAME, parentId)
      if (parentId) expandedFolders.expand(parentId)
      selectFolder(folder.id)
      setRenamingFolderId(folder.id)
    },
    [expandedFolders, selectFolder],
  )

  const handleMoveNote = useCallback((noteId: string, folderId: string | null) => {
    void moveNote(noteId, folderId)
  }, [])

  const handleExport = useCallback(
    async (folder: Folder | null) => {
      const blob = await buildExportZip({ folders: folders ?? [], notes: allNotes ?? [], rootFolderId: folder?.id })
      downloadBlob(blob, exportFileName(folder))
    },
    [folders, allNotes],
  )

  const requestDeleteNote = useCallback((note: Note) => setPendingConfirm({ kind: 'note', note }), [])
  const requestDeleteSelectedNote = useCallback(() => {
    if (selectedNote) requestDeleteNote(selectedNote)
  }, [selectedNote, requestDeleteNote])

  const confirmPending = useCallback(async () => {
    if (!pendingConfirm) return
    setPendingConfirm(null)
    if (pendingConfirm.kind === 'note') {
      const { id } = pendingConfirm.note
      if (id === selectedNoteId) selectNote(nextNoteAfterRemoval(visibleNotes ?? [], id)?.id ?? null)
      await deleteNote(id)
      return
    }
    const { id } = pendingConfirm.folder
    const inSubtree = collectDescendantFolderIds(id, folders ?? [])
    if (folderSelection !== ALL_NOTES_ID && inSubtree.has(folderSelection)) selectFolder(ALL_NOTES_ID)
    await deleteFolder(id)
  }, [pendingConfirm, selectedNoteId, selectNote, visibleNotes, folders, folderSelection, selectFolder])

  const folderActions = useMemo<FolderActions>(
    () => ({
      onSelect: selectFolder,
      onToggleExpanded: expandedFolders.toggle,
      onStartRename: setRenamingFolderId,
      onRenameCommit: (folderId, name) => {
        setRenamingFolderId(null)
        void renameFolder(folderId, name)
      },
      onRenameCancel: () => setRenamingFolderId(null),
      onCreateSubfolder: (folderId) => void handleCreateFolder(folderId),
      onExport: (folderId) => void handleExport(byId.get(folderId) ?? null),
      onRequestDelete: (folderId) => {
        const folder = byId.get(folderId)
        if (folder) setPendingConfirm({ kind: 'folder', folder })
      },
      onDropNote: handleMoveNote,
    }),
    [selectFolder, expandedFolders.toggle, handleCreateFolder, handleExport, byId, handleMoveNote],
  )

  const shortcuts = useMemo<AppShortcutHandlers>(
    () => ({
      onNewNote: () => void handleCreateNote(),
      onNewFolder: () => void handleCreateFolder(null),
      onFocusSearch: () => searchInputRef.current?.focus(),
      onDeleteNote: requestDeleteSelectedNote,
    }),
    [handleCreateNote, handleCreateFolder, requestDeleteSelectedNote],
  )
  useAppShortcuts(shortcuts)

  return (
    <div className={`app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {!sidebarCollapsed && (
        <FolderPane
          tree={tree}
          selection={folderSelection}
          expanded={expandedFolders.expanded}
          renamingId={renamingFolderId}
          counts={counts}
          totalCount={allNotes?.length ?? 0}
          actions={folderActions}
          onSelectAllNotes={() => selectFolder(ALL_NOTES_ID)}
          onCreateFolder={() => void handleCreateFolder(null)}
          onExportAll={() => void handleExport(null)}
          onUnfileNote={(noteId) => handleMoveNote(noteId, null)}
          theme={theme}
          onThemeChange={setTheme}
        />
      )}
      <NoteList
        title={searching ? 'Search results' : (selectedFolder?.name ?? ALL_NOTES_LABEL)}
        notes={visibleNotes}
        selectedNoteId={selectedNoteId}
        query={query}
        onQueryChange={setQuery}
        searchInputRef={searchInputRef}
        hitTerms={searching ? search.hitTerms : undefined}
        folderNameOf={folderNameOf}
        tree={tree}
        onSelect={handleSelectNote}
        onCreateNote={() => void handleCreateNote()}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        onMove={handleMoveNote}
        onRequestDelete={requestDeleteNote}
      />
      <EditorPane
        note={selectedNote}
        autofocus={selectedNote !== null && selectedNote.id === focusNoteId}
        tree={tree}
        onSave={saveNoteContent}
        onMove={handleMoveNote}
        onRequestDelete={requestDeleteNote}
      />
      {pendingConfirm && (
        <ConfirmDialog
          title={pendingConfirm.kind === 'note' ? 'Delete Note' : 'Delete Folder'}
          message={
            pendingConfirm.kind === 'note'
              ? `Delete "${pendingConfirm.note.title}"? This can't be undone.`
              : `Delete "${pendingConfirm.folder.name}" and its subfolders? Notes inside will be kept and moved to All Notes.`
          }
          confirmLabel="Delete"
          destructive
          onConfirm={() => void confirmPending()}
          onCancel={() => setPendingConfirm(null)}
        />
      )}
    </div>
  )
}
