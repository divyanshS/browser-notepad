import { Editor } from '@tiptap/core'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createExtensions } from './extensions'
import { useAutosave, type SaveHandler } from './useAutosave'

// ProseMirror measures layout during view creation; jsdom has no layout engine.
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }
Range.prototype.getClientRects = () => [] as unknown as DOMRectList
Range.prototype.getBoundingClientRect = () => emptyRect as DOMRect
Element.prototype.getClientRects = () => [] as unknown as DOMRectList

const NOTE_ID = 'note-1'
const DELAY = 500

function createEditor(): Editor {
  const element = document.createElement('div')
  document.body.appendChild(element)
  return new Editor({
    element,
    extensions: createExtensions(),
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
  })
}

function blur(editor: Editor): void {
  editor.emit('blur', { editor, event: new FocusEvent('blur'), transaction: editor.state.tr })
}

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useAutosave', () => {
  let editor: Editor
  let onSave: ReturnType<typeof vi.fn<SaveHandler>>

  beforeEach(() => {
    vi.useFakeTimers()
    editor = createEditor()
    onSave = vi.fn<SaveHandler>()
  })

  afterEach(() => {
    editor.destroy()
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('saves once after the debounce delay with JSON and plain text', () => {
    const { result } = renderHook(() => useAutosave(editor, NOTE_ID, onSave, DELAY))

    act(() => {
      editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'paragraph', content: [{ type: 'text', text: 'World' }] })
    })
    expect(result.current.isDirty()).toBe(true)
    expect(onSave).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(DELAY - 1)
    })
    expect(onSave).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onSave).toHaveBeenCalledTimes(1)
    const [id, content, text] = onSave.mock.calls[0]!
    expect(id).toBe(NOTE_ID)
    expect(content).toEqual(editor.getJSON())
    expect(text).toBe('Hello\nWorld')
    expect(result.current.isDirty()).toBe(false)
  })

  it('coalesces rapid updates into a single save', () => {
    renderHook(() => useAutosave(editor, NOTE_ID, onSave, DELAY))

    act(() => {
      for (const char of 'abc') {
        editor.commands.insertContent(char)
        vi.advanceTimersByTime(DELAY / 2)
      }
    })
    expect(onSave).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(DELAY)
    })
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]![2]).toBe('abcHello')
  })

  it('flush() is a no-op when nothing changed', () => {
    const { result } = renderHook(() => useAutosave(editor, NOTE_ID, onSave, DELAY))
    expect(result.current.isDirty()).toBe(false)
    act(() => {
      result.current.flush()
    })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('flushes immediately on editor blur and cancels the pending timer', () => {
    renderHook(() => useAutosave(editor, NOTE_ID, onSave, DELAY))

    act(() => {
      editor.commands.insertContent('!')
      blur(editor)
    })
    expect(onSave).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(DELAY * 2)
    })
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it.each(['beforeunload', 'pagehide'] as const)('flushes on window %s', (eventName) => {
    renderHook(() => useAutosave(editor, NOTE_ID, onSave, DELAY))

    act(() => {
      editor.commands.insertContent('!')
      window.dispatchEvent(new Event(eventName))
    })
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('flushes when the document becomes hidden but not when it becomes visible', () => {
    renderHook(() => useAutosave(editor, NOTE_ID, onSave, DELAY))

    act(() => {
      editor.commands.insertContent('!')
      setVisibility('visible')
    })
    expect(onSave).not.toHaveBeenCalled()

    act(() => {
      setVisibility('hidden')
    })
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('flushes pending changes on unmount and stops listening afterwards', () => {
    const { unmount } = renderHook(() => useAutosave(editor, NOTE_ID, onSave, DELAY))

    act(() => {
      editor.commands.insertContent('!')
    })
    unmount()
    expect(onSave).toHaveBeenCalledTimes(1)

    act(() => {
      editor.commands.insertContent('?')
      window.dispatchEvent(new Event('beforeunload'))
      vi.advanceTimersByTime(DELAY)
    })
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('does nothing without an editor', () => {
    const { result, unmount } = renderHook(() => useAutosave(null, NOTE_ID, onSave, DELAY))
    act(() => {
      result.current.flush()
    })
    unmount()
    expect(onSave).not.toHaveBeenCalled()
  })
})
