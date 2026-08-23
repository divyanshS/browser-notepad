import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { EXPANDED_FOLDERS_KEY, useExpandedFolders } from './useExpandedFolders'

describe('useExpandedFolders', () => {
  beforeEach(() => localStorage.clear())

  it('restores the persisted ids and ignores malformed storage', () => {
    localStorage.setItem(EXPANDED_FOLDERS_KEY, JSON.stringify(['a', 7, 'b']))
    const { result } = renderHook(() => useExpandedFolders())
    expect([...result.current.expanded]).toEqual(['a', 'b'])

    localStorage.setItem(EXPANDED_FOLDERS_KEY, '{not json')
    const broken = renderHook(() => useExpandedFolders())
    expect(broken.result.current.expanded.size).toBe(0)
  })

  it('toggles and expands, persisting every change', () => {
    const { result } = renderHook(() => useExpandedFolders())
    act(() => result.current.toggle('x'))
    expect(result.current.isExpanded('x')).toBe(true)
    act(() => result.current.expand('x'))
    act(() => result.current.expand('y'))
    expect(JSON.parse(localStorage.getItem(EXPANDED_FOLDERS_KEY) ?? '[]')).toEqual(['x', 'y'])
    act(() => result.current.toggle('x'))
    expect(result.current.isExpanded('x')).toBe(false)
    expect(JSON.parse(localStorage.getItem(EXPANDED_FOLDERS_KEY) ?? '[]')).toEqual(['y'])
  })
})
