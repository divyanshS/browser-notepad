import { useEffect, useRef, type ReactElement } from 'react'

export interface ConfirmDialogProps {
  title: string
  message: string
  /** Label of the confirming button, e.g. "Delete". */
  confirmLabel: string
  /** Styles the confirm button as destructive. */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Opens a `<dialog>` modally, falling back to the `open` attribute where `showModal` is unavailable (jsdom). */
function openModal(dialog: HTMLDialogElement): void {
  if (typeof dialog.showModal === 'function') dialog.showModal()
  else dialog.open = true
}

/**
 * Modal confirmation built on the native `<dialog>` element.
 * Render it only while the confirmation is pending; Escape cancels.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) openModal(dialog)
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <h2 id="confirm-dialog-title" className="confirm-dialog-title">
        {title}
      </h2>
      <p id="confirm-dialog-message" className="confirm-dialog-message">
        {message}
      </p>
      <div className="confirm-dialog-actions">
        <button type="button" className="button" onClick={onCancel} autoFocus>
          Cancel
        </button>
        <button
          type="button"
          className={`button${destructive ? ' is-destructive' : ' is-primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
