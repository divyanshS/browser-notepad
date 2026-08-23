export const DEFAULT_TITLE = 'New Note'
export const MAX_TITLE_LENGTH = 120
export const SNIPPET_LENGTH = 140

/** Splits plain text into trimmed lines, dropping empty ones. */
function nonEmptyLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/** Title = first non-empty line of the plain text, truncated. Falls back to "New Note". */
export function deriveTitle(text: string): string {
  const first = nonEmptyLines(text)[0]
  if (!first) return DEFAULT_TITLE
  return first.length > MAX_TITLE_LENGTH ? `${first.slice(0, MAX_TITLE_LENGTH - 1)}…` : first
}

/** Snippet = everything after the title line, whitespace-collapsed and truncated. */
export function deriveSnippet(text: string): string {
  const rest = nonEmptyLines(text).slice(1).join(' ').replace(/\s+/g, ' ').trim()
  if (rest.length === 0) return ''
  return rest.length > SNIPPET_LENGTH ? `${rest.slice(0, SNIPPET_LENGTH - 1)}…` : rest
}

/** Generates a collision-resistant id (UUID v4 where available). */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
