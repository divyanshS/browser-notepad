import { describe, expect, it } from 'vitest'
import { ALL_NOTES_ID, type Note } from '../types'
import { countNotesByFolder, selectNotes } from './useNotes'

function note(id: string, folderId: string | null): Note {
  return { id, folderId, title: id, text: '', content: { type: 'doc' }, createdAt: 0, updatedAt: 0 }
}

const NOTES = [note('a', 'f1'), note('b', null), note('c', 'f2'), note('d', 'f1')]

describe('selectNotes', () => {
  it('returns every note for All Notes and only direct notes for a folder', () => {
    expect(selectNotes(NOTES, ALL_NOTES_ID)).toBe(NOTES)
    expect(selectNotes(NOTES, 'f1').map((n) => n.id)).toEqual(['a', 'd'])
    expect(selectNotes(NOTES, 'missing')).toEqual([])
  })
})

describe('countNotesByFolder', () => {
  it('counts direct notes per folder, with null for unfiled', () => {
    const counts = countNotesByFolder(NOTES)
    expect(counts.get('f1')).toBe(2)
    expect(counts.get('f2')).toBe(1)
    expect(counts.get(null)).toBe(1)
    expect(counts.get('f3')).toBeUndefined()
  })
})
