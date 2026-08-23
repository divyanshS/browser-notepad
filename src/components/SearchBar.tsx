import type { ReactElement, RefObject } from 'react'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  /** Lets the app focus the field for ⌘F. */
  inputRef: RefObject<HTMLInputElement | null>
}

/** Search field above the note list. Escape clears the query (and blurs when already empty). */
export function SearchBar({ value, onChange, inputRef }: SearchBarProps): ReactElement {
  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        type="search"
        className="search-input"
        placeholder="Search"
        aria-label="Search notes"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          if (value) onChange('')
          else event.currentTarget.blur()
        }}
      />
    </div>
  )
}
