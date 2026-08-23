import { act, renderHook } from '@testing-library/react'
import { THEME_KEY, useTheme } from './useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to system and leaves the html element untouched', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('applies the chosen theme to <html> and persists it', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current[1]('dark'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')

    act(() => result.current[1]('system'))
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('ignores unknown stored values', () => {
    localStorage.setItem(THEME_KEY, 'sepia')
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe('system')
  })
})
