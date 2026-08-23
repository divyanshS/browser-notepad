import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ALL_NOTES_ID, type Note } from '../types'
import { useSelection } from './useSelection'

function note(id: string, folderId: string | null, updatedAt: number): Note {
  return { id, folderId, title: id, text: '', content: { type: 'doc' }, createdAt: updatedAt, updatedAt }
}

// Newest first, as produced by useAllNotes.
const NOTES: Note[] = [note('n3', 'f1', 3), note('n2', null, 2), note('n1', 'f1', 1)]

describe('useSelection', () => {
  it('starts on All Notes with nothing selected', () => {
    const { result } = renderHook(() => useSelection(NOTES))
    expect(result.current.folderSelection).toBe(ALL_NOTES_ID)
    expect(result.current.selectedNoteId).toBeNull()
    expect(result.current.notes).toBe(NOTES)
  })

  it('auto-selects the most recent note of a newly selected folder', () => {
    const { result } = renderHook(() => useSelection(NOTES))
    act(() => result.current.selectFolder('f1'))
    expect(result.current.notes?.map((n) => n.id)).toEqual(['n3', 'n1'])
    expect(result.current.selectedNoteId).toBe('n3')

    act(() => result.current.selectFolder('empty'))
    expect(result.current.selectedNoteId).toBeNull()
  })

  it('defers the auto-select until the notes have loaded', () => {
    const { result, rerender } = renderHook(({ notes }) => useSelection(notes), {
      initialProps: { notes: undefined as Note[] | undefined },
    })
    act(() => result.current.selectFolder(ALL_NOTES_ID))
    expect(result.current.selectedNoteId).toBeNull()
    rerender({ notes: NOTES })
    expect(result.current.selectedNoteId).toBe('n3')
  })

  it('an explicit note selection cancels a pending auto-select', () => {
    const { result, rerender } = renderHook(({ notes }) => useSelection(notes), {
      initialProps: { notes: undefined as Note[] | undefined },
    })
    act(() => result.current.selectFolder('f1'))
    act(() => result.current.selectNote('n1'))
    rerender({ notes: NOTES })
    expect(result.current.selectedNoteId).toBe('n1')
  })
})
