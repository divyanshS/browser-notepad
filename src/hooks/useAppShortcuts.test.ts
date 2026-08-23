import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IS_MAC, useAppShortcuts, type AppShortcutHandlers } from './useAppShortcuts'

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = window): KeyboardEvent {
  const mod = IS_MAC ? { metaKey: true } : { ctrlKey: true }
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mod, ...init })
  target.dispatchEvent(event)
  return event
}

describe('useAppShortcuts', () => {
  let handlers: AppShortcutHandlers

  beforeEach(() => {
    handlers = { onNewNote: vi.fn(), onNewFolder: vi.fn(), onFocusSearch: vi.fn(), onDeleteNote: vi.fn() }
    renderHook(() => useAppShortcuts(handlers))
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('maps Mod+N, Mod+Shift+N and Mod+F', () => {
    expect(press('n').defaultPrevented).toBe(true)
    press('N', { shiftKey: true })
    press('f')
    expect(handlers.onNewNote).toHaveBeenCalledTimes(1)
    expect(handlers.onNewFolder).toHaveBeenCalledTimes(1)
    expect(handlers.onFocusSearch).toHaveBeenCalledTimes(1)
    expect(handlers.onDeleteNote).not.toHaveBeenCalled()
  })

  it('ignores keys without the modifier', () => {
    const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(handlers.onNewNote).not.toHaveBeenCalled()
  })

  it('deletes with Mod+Backspace only when focus is outside the editor and text fields', () => {
    press('Backspace')
    expect(handlers.onDeleteNote).toHaveBeenCalledTimes(1)

    const editor = document.createElement('div')
    editor.className = 'note-editor'
    const paragraph = document.createElement('p')
    editor.append(paragraph)
    const input = document.createElement('input')
    document.body.append(editor, input)

    press('Backspace', {}, paragraph)
    press('Backspace', {}, input)
    expect(handlers.onDeleteNote).toHaveBeenCalledTimes(1)
  })
})
