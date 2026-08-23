import type { Editor, JSONContent } from '@tiptap/core'
import { useCallback, useEffect, useMemo, useRef } from 'react'

/** Persists a note's content. May be async; the hook does not await it. */
export type SaveHandler = (noteId: string, content: JSONContent, text: string) => void | Promise<void>

export interface AutosaveHandle {
  /** Saves immediately when there are unsaved changes; a no-op otherwise. */
  flush: () => void
  /** Whether there are changes not yet handed to `onSave`. */
  isDirty: () => boolean
}

/** Default debounce delay in milliseconds. */
export const AUTOSAVE_DELAY = 500

/**
 * Debounced autosave for a Tiptap editor.
 * Every `update` schedules a save after `delay` ms. Pending changes are flushed on editor blur,
 * `beforeunload`, `pagehide`, `visibilitychange` (hidden) and when the hook unmounts.
 * Unchanged content is never saved.
 */
export function useAutosave(
  editor: Editor | null,
  noteId: string,
  onSave: SaveHandler,
  delay: number = AUTOSAVE_DELAY,
): AutosaveHandle {
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)
  useEffect(() => {
    onSaveRef.current = onSave
  })

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const flush = useCallback(() => {
    clearTimer()
    if (!dirtyRef.current || !editor || editor.isDestroyed) return
    dirtyRef.current = false
    void onSaveRef.current(noteId, editor.getJSON(), editor.getText({ blockSeparator: '\n' }))
  }, [clearTimer, editor, noteId])

  const isDirty = useCallback(() => dirtyRef.current, [])

  useEffect(() => {
    if (!editor) return

    const schedule = () => {
      dirtyRef.current = true
      clearTimer()
      timerRef.current = setTimeout(flush, delay)
    }
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    editor.on('update', schedule)
    editor.on('blur', flush)
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flushWhenHidden)

    return () => {
      editor.off('update', schedule)
      editor.off('blur', flush)
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flushWhenHidden)
      flush()
    }
  }, [editor, delay, flush, clearTimer])

  return useMemo(() => ({ flush, isDirty }), [flush, isDirty])
}
