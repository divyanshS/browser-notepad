import JSZip from 'jszip'
import type { JSONContent } from '@tiptap/core'
import type { Folder, Note } from '../types'
import {
  buildExportZip,
  buildExportZipData,
  downloadBlob,
  exportFileName,
  planExport,
  sanitizeFileName,
  type ExportInput,
} from './exportZip'

function folder(id: string, name: string, parentId: string | null = null): Folder {
  return { id, name, parentId, createdAt: 1, updatedAt: 1 }
}

function doc(title: string, body?: string): JSONContent {
  const content: JSONContent[] = [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: title }] }]
  if (body) content.push({ type: 'paragraph', content: [{ type: 'text', text: body }] })
  return { type: 'doc', content }
}

function note(id: string, folderId: string | null, title: string, updatedAt = 1, body?: string): Note {
  return { id, folderId, title, text: title, content: doc(title, body), createdAt: 1, updatedAt }
}

/** A small library: Work/{Projects,Archive}, Personal, plus unfiled notes. */
function library(): ExportInput {
  return {
    folders: [
      folder('work', 'Work'),
      folder('personal', 'Personal'),
      folder('projects', 'Projects', 'work'),
      folder('archive', 'Archive', 'work'),
    ],
    notes: [
      note('n1', null, 'Loose idea', 10, 'Some **bold** text'),
      note('n2', null, 'Older loose idea', 5),
      note('n3', 'work', 'Roadmap', 20),
      note('n4', 'projects', 'Alpha', 30),
      note('n5', 'personal', 'Groceries', 40),
    ],
  }
}

function paths(input: ExportInput): string[] {
  return planExport(input).map((entry) => entry.path)
}

describe('planExport', () => {
  it('lays out the whole library with unfiled notes at the root and folders as directories', () => {
    expect(planExport(library())).toEqual([
      { path: 'Loose idea.md', noteId: 'n1' },
      { path: 'Older loose idea.md', noteId: 'n2' },
      { path: 'Personal/Groceries.md', noteId: 'n5' },
      { path: 'Work/Roadmap.md', noteId: 'n3' },
      { path: 'Work/Projects/Alpha.md', noteId: 'n4' },
    ])
  })

  it('exports a single folder as the top-level directory and excludes everything else', () => {
    expect(planExport({ ...library(), rootFolderId: 'work' })).toEqual([
      { path: 'Work/Roadmap.md', noteId: 'n3' },
      { path: 'Work/Projects/Alpha.md', noteId: 'n4' },
    ])
  })

  it('treats undefined and null rootFolderId as the whole library', () => {
    const input = library()
    expect(planExport({ ...input, rootFolderId: null })).toEqual(planExport(input))
  })

  it('throws when the root folder does not exist', () => {
    expect(() => planExport({ ...library(), rootFolderId: 'missing' })).toThrow(/does not exist/)
  })

  it('orders sibling folders by name (numeric-aware) and notes by updatedAt descending', () => {
    const input: ExportInput = {
      folders: [folder('f10', 'Chapter 10'), folder('f2', 'chapter 2'), folder('f1', 'Chapter 1')],
      notes: [note('old', null, 'Old', 1), note('new', null, 'New', 3), note('mid', null, 'Mid', 2)],
    }
    expect(paths(input)).toEqual(['New.md', 'Mid.md', 'Old.md'])
    expect(paths({ ...input, notes: [note('a', 'f10', 'A'), note('b', 'f2', 'B'), note('c', 'f1', 'C')] })).toEqual([
      'Chapter 1/C.md',
      'chapter 2/B.md',
      'Chapter 10/A.md',
    ])
  })

  it('treats orphaned folders as top-level and notes in missing folders as unfiled', () => {
    const input: ExportInput = {
      folders: [folder('orphan', 'Orphan', 'gone')],
      notes: [note('a', 'orphan', 'Inside orphan'), note('b', 'gone', 'Lost note')],
    }
    expect(paths(input)).toEqual(['Lost note.md', 'Orphan/Inside orphan.md'])
  })

  it('does not loop forever on a folder cycle', () => {
    const input: ExportInput = {
      folders: [folder('a', 'A', 'b'), folder('b', 'B', 'a')],
      notes: [note('n', 'b', 'In B')],
      rootFolderId: 'a',
    }
    expect(paths(input)).toEqual(['A/B/In B.md'])
  })

  describe('de-duplication', () => {
    it('suffixes duplicate note titles in the same directory, giving the clean name to the newest', () => {
      const input: ExportInput = {
        folders: [],
        notes: [note('oldest', null, 'Todo', 1), note('newest', null, 'Todo', 3), note('middle', null, 'todo', 2)],
      }
      expect(planExport(input)).toEqual([
        { path: 'Todo.md', noteId: 'newest' },
        { path: 'todo (2).md', noteId: 'middle' },
        { path: 'Todo (3).md', noteId: 'oldest' },
      ])
    })

    it('does not suffix the same title in different directories', () => {
      const input: ExportInput = {
        folders: [folder('f', 'F')],
        notes: [note('a', null, 'Todo'), note('b', 'f', 'Todo')],
      }
      expect(paths(input)).toEqual(['Todo.md', 'F/Todo.md'])
    })

    it('suffixes sibling folders with the same name, case-insensitively', () => {
      const input: ExportInput = {
        folders: [folder('f1', 'Ideas'), folder('f2', 'ideas'), folder('f3', 'IDEAS')],
        notes: [note('a', 'f1', 'A'), note('b', 'f2', 'B'), note('c', 'f3', 'C')],
      }
      expect(paths(input)).toEqual(['Ideas/A.md', 'ideas (2)/B.md', 'IDEAS (3)/C.md'])
    })

    it('suffixes titles that collide only after sanitizing', () => {
      const input: ExportInput = {
        folders: [],
        notes: [note('a', null, 'a/b', 2), note('b', null, 'a:b', 1), note('c', null, '   ', 0)],
      }
      expect(paths(input)).toEqual(['ab.md', 'ab (2).md', 'Untitled.md'])
    })

    it('keeps a note from colliding with a sibling directory of the same full name', () => {
      const input: ExportInput = {
        folders: [folder('f', 'Readme.md')],
        notes: [note('a', null, 'Readme'), note('b', 'f', 'Inner')],
      }
      expect(paths(input)).toEqual(['Readme.md', 'Readme.md (2)/Inner.md'])
    })

    it('uses fallback names for empty folder names and dedupes them too', () => {
      const input: ExportInput = {
        folders: [folder('f1', '...'), folder('f2', '')],
        notes: [note('a', 'f1', 'A'), note('b', 'f2', 'B')],
      }
      expect(paths(input)).toEqual(['Untitled Folder/B.md', 'Untitled Folder (2)/A.md'])
    })
  })
})

describe('sanitizeFileName', () => {
  it('strips path separators and reserved punctuation', () => {
    expect(sanitizeFileName('a/b:c', 'x')).toBe('abc')
    expect(sanitizeFileName('we*ird?"na<me>|here\\too', 'x')).toBe('weirdnameheretoo')
  })

  it('strips control characters', () => {
    expect(sanitizeFileName('tab\there\u0000nul\u001fus\u007fdel', 'x')).toBe('tabherenulusdel')
  })

  it('trims surrounding dots and whitespace but keeps inner ones', () => {
    expect(sanitizeFileName('  .hidden notes v1.0. ', 'x')).toBe('hidden notes v1.0')
  })

  it('falls back for names that are empty after cleaning', () => {
    expect(sanitizeFileName('..', 'Untitled')).toBe('Untitled')
    expect(sanitizeFileName('   ', 'Untitled')).toBe('Untitled')
    expect(sanitizeFileName('', 'Untitled')).toBe('Untitled')
    expect(sanitizeFileName('/:*?', 'Untitled')).toBe('Untitled')
  })

  it('caps very long names at 80 characters and re-trims the cut edge', () => {
    expect(sanitizeFileName('x'.repeat(200), 'x')).toBe('x'.repeat(80))
    expect(sanitizeFileName(`${'y'.repeat(79)} ${'z'.repeat(50)}`, 'x')).toBe('y'.repeat(79))
  })

  it('does not split a surrogate pair when truncating', () => {
    const emoji = '😀'.repeat(100)
    expect(sanitizeFileName(emoji, 'x')).toBe('😀'.repeat(80))
  })

  it('prefixes Windows-reserved device names so the zip extracts on Windows', () => {
    expect(sanitizeFileName('CON', 'x')).toBe('_CON')
    expect(sanitizeFileName('nul.txt', 'x')).toBe('_nul.txt')
    expect(sanitizeFileName('COM1', 'x')).toBe('_COM1')
    expect(sanitizeFileName('LPT9', 'x')).toBe('_LPT9')
    expect(sanitizeFileName('console', 'x')).toBe('console')
    expect(sanitizeFileName('com10', 'x')).toBe('com10')
  })
})

describe('exportFileName', () => {
  const date = new Date(2026, 0, 5)

  it('names a whole-library export with the local date', () => {
    expect(exportFileName(undefined, date)).toBe('notes-export-2026-01-05.zip')
    expect(exportFileName(null, date)).toBe('notes-export-2026-01-05.zip')
  })

  it('names a folder export after the sanitized folder name', () => {
    expect(exportFileName(folder('f', 'Work: 2026/Q1'), date)).toBe('Work 2026Q1-2026-01-05.zip')
    expect(exportFileName(folder('f', '...'), date)).toBe('Untitled Folder-2026-01-05.zip')
  })

  it('defaults to the current date', () => {
    expect(exportFileName()).toMatch(/^notes-export-\d{4}-\d{2}-\d{2}\.zip$/)
  })
})

describe('buildExportZipData / buildExportZip', () => {
  it('round-trips the whole library through JSZip with directory entries for every folder', async () => {
    const input = library()
    input.folders.push(folder('empty', 'Empty', 'personal'))
    const zip = await JSZip.loadAsync(await buildExportZipData(input))

    expect(Object.keys(zip.files).sort()).toEqual(
      [
        'Loose idea.md',
        'Older loose idea.md',
        'Personal/',
        'Personal/Groceries.md',
        'Personal/Empty/',
        'Work/',
        'Work/Roadmap.md',
        'Work/Archive/',
        'Work/Projects/',
        'Work/Projects/Alpha.md',
      ].sort(),
    )
    expect(zip.files['Personal/Empty/'].dir).toBe(true)
    expect(zip.files['Work/Roadmap.md'].dir).toBe(false)
    await expect(zip.file('Loose idea.md')?.async('string')).resolves.toBe('# Loose idea\n\nSome \\*\\*bold\\*\\* text\n')
    await expect(zip.file('Work/Projects/Alpha.md')?.async('string')).resolves.toBe('# Alpha\n')
  })

  it('round-trips a per-folder export rooted at that folder', async () => {
    const zip = await JSZip.loadAsync(await buildExportZipData({ ...library(), rootFolderId: 'work' }))
    expect(Object.keys(zip.files).sort()).toEqual(
      ['Work/', 'Work/Roadmap.md', 'Work/Archive/', 'Work/Projects/', 'Work/Projects/Alpha.md'].sort(),
    )
  })

  it('produces an empty archive for an empty library', async () => {
    const zip = await JSZip.loadAsync(await buildExportZipData({ folders: [], notes: [] }))
    expect(Object.keys(zip.files)).toEqual([])
  })

  it('wraps the bytes in an application/zip Blob', async () => {
    const blob = await buildExportZip(library())
    expect(blob.type).toBe('application/zip')
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    expect(zip.file('Personal/Groceries.md')).not.toBeNull()
  })
})

describe('downloadBlob', () => {
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    // jsdom does not implement object URLs.
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clicks a temporary download link and revokes the object URL afterwards', () => {
    const clicked: HTMLAnchorElement[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this)
    })
    const blob = new Blob(['zip'], { type: 'application/zip' })

    downloadBlob(blob, 'notes.zip')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toBe('notes.zip')
    expect(clicked[0].href).toBe('blob:mock-url')
    expect(clicked[0].isConnected).toBe(false)
    expect(revokeObjectURL).not.toHaveBeenCalled()

    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    click.mockRestore()
  })
})
