import { useCallback, type KeyboardEvent } from 'react'

/**
 * Returns a keydown handler that moves focus between the menu items matching
 * `itemSelector` with ArrowUp/ArrowDown, wrapping at both ends.
 */
export function useMenuNavigation(itemSelector: string): (event: KeyboardEvent<HTMLElement>) => void {
  return useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(itemSelector))
      if (items.length === 0) return
      event.preventDefault()
      const index = items.findIndex((item) => item === document.activeElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      items[(index + step + items.length) % items.length].focus()
    },
    [itemSelector],
  )
}
