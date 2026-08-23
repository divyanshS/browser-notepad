import { useEffect } from 'react'

/** Whether the primary modifier is ⌘ (macOS / iOS) rather than Ctrl. */
export const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

/** Display label of the primary modifier key: `⌘` or `Ctrl`. */
export const MOD_KEY_LABEL = IS_MAC ? '⌘' : 'Ctrl'

export interface AppShortcutHandlers {
  /** Mod+N */
  onNewNote: () => void
  /** Mod+Shift+N */
  onNewFolder: () => void
  /** Mod+F */
  onFocusSearch: () => void
  /** Mod+Backspace — only fired when focus is not inside the editor or a text field. */
  onDeleteNote: () => void
}

/** True when the keyboard event originates from the note editor or any text input. */
function isTextEntryTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('.note-editor, input, textarea, [contenteditable="true"]') !== null
  )
}

/** Resolves the app-level action for a keydown, or `null` when the key is not a shortcut. */
function resolveAction(event: KeyboardEvent): keyof AppShortcutHandlers | null {
  const mod = IS_MAC ? event.metaKey : event.ctrlKey
  if (!mod || event.altKey) return null
  const key = event.key.toLowerCase()
  if (key === 'n') return event.shiftKey ? 'onNewFolder' : 'onNewNote'
  if (key === 'f' && !event.shiftKey) return 'onFocusSearch'
  if (key === 'backspace' && !event.shiftKey && !isTextEntryTarget(event.target)) return 'onDeleteNote'
  return null
}

/** Registers the global keyboard shortcuts (⌘N, ⌘⇧N, ⌘F, ⌘⌫ — Ctrl on other platforms). */
export function useAppShortcuts(handlers: AppShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const action = resolveAction(event)
      if (!action) return
      event.preventDefault()
      handlers[action]()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
