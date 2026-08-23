import { act, renderHook } from '@testing-library/react'
import { SIDEBAR_COLLAPSED_KEY, useSidebarCollapsed } from './useSidebarCollapsed'

describe('useSidebarCollapsed', () => {
  beforeEach(() => localStorage.clear())

  it('starts expanded, toggles, and persists', () => {
    const { result } = renderHook(() => useSidebarCollapsed())
    expect(result.current[0]).toBe(false)
    act(() => result.current[1]())
    expect(result.current[0]).toBe(true)
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('true')
  })

  it('restores the stored state', () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true')
    const { result } = renderHook(() => useSidebarCollapsed())
    expect(result.current[0]).toBe(true)
  })
})
