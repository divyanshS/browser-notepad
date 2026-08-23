import type { ReactNode } from 'react'

/** Escapes every character with special meaning inside a regular expression. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Unique (case-insensitive), non-empty terms ordered longest first so longer terms win over their substrings. */
function normalizeTerms(terms: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const term of terms) {
    const key = term.toLowerCase()
    if (key.length === 0 || seen.has(key)) continue
    seen.add(key)
    unique.push(term)
  }
  return unique.sort((a, b) => b.length - a.length)
}

/**
 * Builds a global, case-insensitive regex matching any of the given terms anywhere in a string.
 * Terms are escaped, so regex-special characters (`c++`, `a.b`) are matched literally.
 * Returns `null` when there are no non-empty terms.
 */
export function buildHighlightRegex(terms: string[]): RegExp | null {
  const normalized = normalizeTerms(terms)
  if (normalized.length === 0) return null
  return new RegExp(normalized.map(escapeRegExp).join('|'), 'gi')
}

/**
 * Wraps every case-insensitive occurrence of each term in `<mark class="search-highlight">`.
 * Longer terms take precedence, and marks are never nested.
 * Returns `text` unchanged when there are no terms or nothing matches.
 */
export function highlightText(text: string, terms: string[]): ReactNode {
  const regex = buildHighlightRegex(terms)
  if (regex === null) return text

  const parts: ReactNode[] = []
  let cursor = 0
  for (const match of text.matchAll(regex)) {
    const start = match.index
    const end = start + match[0].length
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      <mark key={start} className="search-highlight">
        {match[0]}
      </mark>,
    )
    cursor = end
  }
  if (parts.length === 0) return text
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}
