import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import {
  APP_NAME,
  AUTHOR_NAME,
  DISCLAIMER,
  GITHUB_URL,
  LICENSE_NAME,
  LICENSE_URL,
  LINKEDIN_URL,
  REPO_URL,
} from '../lib/appInfo'

/** Opens a `<dialog>` modally, falling back to the `open` attribute where `showModal` is unavailable (jsdom). */
function openModal(dialog: HTMLDialogElement): void {
  if (typeof dialog.showModal === 'function') dialog.showModal()
  else dialog.open = true
}

interface ExternalLinkProps {
  href: string
  children: ReactNode
}

/** Outbound link, opened in a new tab with the opener detached. */
function ExternalLink({ href, children }: ExternalLinkProps): ReactElement {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

interface AboutDialogProps {
  onClose: () => void
}

/** Modal describing the project, its author and the liability disclaimer. */
function AboutDialog({ onClose }: AboutDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) openModal(dialog)
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog about-dialog"
      aria-labelledby="about-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <h2 id="about-dialog-title" className="confirm-dialog-title">
        About {APP_NAME}
      </h2>
      <p className="confirm-dialog-message">
        A local-first notes app that runs entirely in your browser — no server, no account, no tracking.
        Vibe-coded by {AUTHOR_NAME} for personal use and open-sourced under the{' '}
        <ExternalLink href={LICENSE_URL}>{LICENSE_NAME} licence</ExternalLink>.
      </p>
      <ul className="about-links">
        <li>
          <ExternalLink href={REPO_URL}>Source code on GitHub</ExternalLink>
        </li>
        <li>
          <ExternalLink href={GITHUB_URL}>GitHub profile</ExternalLink>
        </li>
        <li>
          <ExternalLink href={LINKEDIN_URL}>LinkedIn</ExternalLink>
        </li>
      </ul>
      <h3 className="about-subtitle">Disclaimer</h3>
      <p className="confirm-dialog-message">{DISCLAIMER}</p>
      <div className="confirm-dialog-actions">
        <button type="button" className="button" onClick={onClose} autoFocus>
          Close
        </button>
      </div>
    </dialog>
  )
}

/**
 * Subtle attribution shown at the bottom of the folder pane, with an
 * "About" button revealing the project links and the disclaimer.
 */
export function AboutSection(): ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <>
      <p className="about-line">
        By <ExternalLink href={LINKEDIN_URL}>{AUTHOR_NAME}</ExternalLink>
        <span aria-hidden="true"> · </span>
        <ExternalLink href={REPO_URL}>Source</ExternalLink>
        <span aria-hidden="true"> · </span>
        <button type="button" className="link-button" onClick={() => setOpen(true)}>
          About
        </button>
      </p>
      {open && <AboutDialog onClose={() => setOpen(false)} />}
    </>
  )
}
