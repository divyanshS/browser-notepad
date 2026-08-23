import type { ReactElement } from 'react'

export interface EmptyStateProps {
  title: string
  hint?: string
}

/** Centered placeholder for an empty pane. */
export function EmptyState({ title, hint }: EmptyStateProps): ReactElement {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      {hint && <p className="empty-state-hint">{hint}</p>}
    </div>
  )
}
