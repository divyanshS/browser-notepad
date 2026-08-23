import { useCallback, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { useDismissable } from '../hooks/useDismissable'
import { useMenuNavigation } from '../hooks/useMenuNavigation'
import { EllipsisIcon } from './Icons'

export interface MenuAction {
  id: string
  label: string
  /** Renders the item in the destructive (red) style. */
  destructive?: boolean
  onSelect: () => void
}

export interface ActionMenuProps {
  /** Accessible name of the trigger button, e.g. "Note actions". */
  label: string
  actions: MenuAction[]
  className?: string
  /** Trigger icon; defaults to an ellipsis. */
  icon?: ReactNode
}

const ITEM_SELECTOR = '[role="menuitem"]'

function focusFirstItem(menu: HTMLDivElement | null): void {
  menu?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus()
}

/**
 * A "⋯" button that opens a small popover menu of actions.
 * Closes on selection, Escape or a click outside.
 */
export function ActionMenu({ label, actions, className, icon }: ActionMenuProps): ReactElement {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismissable(rootRef, open, close)
  const onMenuKeyDown = useMenuNavigation(ITEM_SELECTOR)

  return (
    <div ref={rootRef} className={`action-menu${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="icon-button action-menu-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        {icon ?? <EllipsisIcon />}
      </button>
      {open && (
        <div
          ref={focusFirstItem}
          className="popover-menu"
          role="menu"
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={onMenuKeyDown}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              className={`popover-menu-item${action.destructive ? ' is-destructive' : ''}`}
              onClick={() => {
                close()
                action.onSelect()
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
