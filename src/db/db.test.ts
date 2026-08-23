import type { Folder } from '../types'
import { DEFAULT_TITLE, deriveTitle } from '../lib/noteText'
import {
  UNTITLED_FOLDER_NAME,
  buildFolderTree,
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
} from './db'
import { welcomeNoteContent, welcomeNoteText } from './welcomeNote'

function folder(id: string, name: string, parentId: string | null = null): Folder {
  return { id, name, parentId, createdAt: 0, updatedAt: 0 }
}

beforeEach(async () => {
  await Promise.all([db.folders.clear(), db.notes.clear(), db.meta.clear()])
})

describe('folders', () => {
  it('creates a top-level folder with a trimmed name', async () => {
    const created = await createFolder('  Work  ')
    expect(created.name).toBe('Work')
    expect(created.parentId).toBeNull()
    expect(await db.folders.get(created.id)).toEqual(created)
  })

  it('creates nested folders and falls back to an untitled name', async () => {
    const parent = await createFolder('Parent')
    const child = await createFolder('   ', parent.id)
    expect(child.parentId).toBe(parent.id)
    expect(child.name).toBe(UNTITLED_FOLDER_NAME)
  })

  it('renames a folder, trimming the name and bumping updatedAt', async () => {
    const created = await createFolder('Old')
    await db.folders.update(created.id, { updatedAt: 1 })
    await renameFolder(created.id, '  New  ')
    const stored = await db.folders.get(created.id)
    expect(stored?.name).toBe('New')
    expect(stored?.updatedAt).toBeGreaterThan(1)
  })

  it('ignores blank names when renaming', async () => {
    const created = await createFolder('Keep')
    await renameFolder(created.id, '   ')
    expect((await db.folders.get(created.id))?.name).toBe('Keep')
  })

  it('deleteFolder removes the subtree and unfiles its notes', async () => {
    const root = await createFolder('Root')
    const child = await createFolder('Child', root.id)
    const grandchild = await createFolder('Grandchild', child.id)
    const sibling = await createFolder('Sibling')

    const inRoot = await createNote(root.id)
    const inGrandchild = await createNote(grandchild.id)
    const inSibling = await createNote(sibling.id)

    await deleteFolder(root.id)

    expect((await db.folders.toArray()).map((f) => f.id)).toEqual([sibling.id])
    expect((await db.notes.get(inRoot.id))?.folderId).toBeNull()
    expect((await db.notes.get(inGrandchild.id))?.folderId).toBeNull()
    expect((await db.notes.get(inSibling.id))?.folderId).toBe(sibling.id)
    expect(await db.notes.count()).toBe(3)
  })
})

describe('notes', () => {
  it('creates an empty note with the default title', async () => {
    const note = await createNote(null)
    expect(note.title).toBe(DEFAULT_TITLE)
    expect(note.text).toBe('')
    expect(note.content).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
    expect(await db.notes.get(note.id)).toEqual(note)
  })

  it('saveNoteContent stores content and derives the title', async () => {
    const note = await createNote(null)
    await db.notes.update(note.id, { updatedAt: 1 })
    const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] }

    await saveNoteContent(note.id, content, '\n  Shopping list \nmilk')

    const stored = await db.notes.get(note.id)
    expect(stored?.content).toEqual(content)
    expect(stored?.text).toBe('\n  Shopping list \nmilk')
    expect(stored?.title).toBe('Shopping list')
    expect(stored?.updatedAt).toBeGreaterThan(1)
  })

  it('saveNoteContent is a no-op for a missing note', async () => {
    await saveNoteContent('missing', { type: 'doc' }, 'ghost')
    expect(await db.notes.count()).toBe(0)
  })

  it('moves a note between folders and to unfiled', async () => {
    const target = await createFolder('Target')
    const note = await createNote(null)
    await db.notes.update(note.id, { updatedAt: 1 })

    await moveNote(note.id, target.id)
    let stored = await db.notes.get(note.id)
    expect(stored?.folderId).toBe(target.id)
    expect(stored?.updatedAt).toBeGreaterThan(1)

    await moveNote(note.id, null)
    stored = await db.notes.get(note.id)
    expect(stored?.folderId).toBeNull()
  })

  it('deletes a note', async () => {
    const note = await createNote(null)
    await deleteNote(note.id)
    expect(await db.notes.get(note.id)).toBeUndefined()
  })
})

describe('seedWelcomeNoteIfEmpty', () => {
  it('seeds an unfiled welcome note on an empty database', async () => {
    await seedWelcomeNoteIfEmpty()
    const notes = await db.notes.toArray()
    expect(notes).toHaveLength(1)
    expect(notes[0]?.folderId).toBeNull()
    expect(notes[0]?.title).toBe('Welcome to Notes')
    expect(notes[0]?.content).toEqual(welcomeNoteContent)
    expect(notes[0]?.text).toBe(welcomeNoteText)
    expect(await db.meta.get('seeded')).toEqual({ key: 'seeded', value: '1' })
  })

  it('seeds only once under concurrent invocation', async () => {
    await Promise.all([seedWelcomeNoteIfEmpty(), seedWelcomeNoteIfEmpty()])
    expect(await db.notes.count()).toBe(1)
  })

  it('does not seed again after the welcome note was deleted', async () => {
    await seedWelcomeNoteIfEmpty()
    const [welcome] = await db.notes.toArray()
    await deleteNote(welcome!.id)
    await seedWelcomeNoteIfEmpty()
    expect(await db.notes.count()).toBe(0)
  })

  it('does not seed when notes already exist', async () => {
    const existing = await createNote(null)
    await seedWelcomeNoteIfEmpty()
    expect((await db.notes.toArray()).map((n) => n.id)).toEqual([existing.id])
  })
})

describe('welcome note', () => {
  it('derives the expected title from its plain text', () => {
    expect(deriveTitle(welcomeNoteText)).toBe('Welcome to Notes')
  })

  it('projects headings, paragraphs and list items as newline-separated lines', () => {
    const lines = welcomeNoteText.split('\n')
    expect(lines[0]).toBe('Welcome to Notes')
    expect(lines).toContain('Markdown shortcuts')
    expect(lines).toContain('⌘N new note')
    expect(lines).toContain('# or ## for headings')
    expect(lines.every((line) => line.trim().length > 0)).toBe(true)
  })

  it('mentions the documented features', () => {
    for (const fragment of ['IndexedDB', '⌘B', '⌘⇧X', '⌘⇧N', '⌘F', '⌘⌫', 'Markdown']) {
      expect(welcomeNoteText).toContain(fragment)
    }
  })
})

describe('collectDescendantFolderIds', () => {
  const folders = [
    folder('a', 'A'),
    folder('b', 'B', 'a'),
    folder('c', 'C', 'b'),
    folder('d', 'D', 'a'),
    folder('x', 'X'),
    folder('y', 'Y', 'x'),
  ]

  it('includes the root and all nested descendants', () => {
    expect([...collectDescendantFolderIds('a', folders)].sort()).toEqual(['a', 'b', 'c', 'd'])
    expect([...collectDescendantFolderIds('b', folders)].sort()).toEqual(['b', 'c'])
  })

  it('returns only the root for a leaf or unknown folder', () => {
    expect([...collectDescendantFolderIds('c', folders)]).toEqual(['c'])
    expect([...collectDescendantFolderIds('nope', folders)]).toEqual(['nope'])
  })
})

describe('buildFolderTree', () => {
  it('nests children under parents and sorts naturally by name at every level', () => {
    const tree = buildFolderTree([
      folder('p2', 'Projects 10'),
      folder('p1', 'projects 2'),
      folder('c2', 'zeta', 'p1'),
      folder('c1', 'Alpha', 'p1'),
      folder('g1', 'Deep', 'c1'),
    ])

    expect(tree.map((n) => n.folder.id)).toEqual(['p1', 'p2'])
    expect(tree[0]?.children.map((n) => n.folder.id)).toEqual(['c1', 'c2'])
    expect(tree[0]?.children[0]?.children.map((n) => n.folder.id)).toEqual(['g1'])
    expect(tree[1]?.children).toEqual([])
  })

  it('treats orphaned folders as top-level', () => {
    const tree = buildFolderTree([folder('orphan', 'Orphan', 'gone'), folder('root', 'Root')])
    expect(tree.map((n) => n.folder.id)).toEqual(['orphan', 'root'])
  })

  it('returns an empty tree for no folders', () => {
    expect(buildFolderTree([])).toEqual([])
  })
})
