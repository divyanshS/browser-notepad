import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * `useState` backed by `localStorage`. `parse` validates the raw stored string and
 * must return `fallback` for anything it does not recognise, so corrupt or stale
 * values can never leak into the UI. Storage failures (private mode, quota) are ignored.
 */
export function usePersistedValue<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T,
  serialize: (value: T) => string = String,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? fallback : parse(raw)
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(value))
    } catch {
      // Persistence is a convenience only.
    }
  }, [key, value, serialize])

  return [value, setValue]
}
