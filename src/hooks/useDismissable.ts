import { useEffect, type RefObject } from 'react'

/**
 * While `active`, calls `onDismiss` when the user presses Escape or presses the
 * pointer outside the referenced element. Used by popover menus.
 */
export function useDismissable(ref: RefObject<HTMLElement | null>, active: boolean, onDismiss: () => void): void {
  useEffect(() => {
    if (!active) return
    const onPointerDown = (event: MouseEvent) => {
      if (event.target instanceof Node && ref.current?.contains(event.target)) return
      onDismiss()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onDismiss()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [ref, active, onDismiss])
}
