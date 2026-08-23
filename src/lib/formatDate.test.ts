import { describe, expect, it } from 'vitest'
import { formatLongDate, formatNoteDate } from './formatDate'

const NOW = new Date(2026, 7, 23, 15, 45) // Aug 23 2026, 15:45 local time

describe('formatNoteDate', () => {
  it('shows the time for timestamps from today', () => {
    expect(formatNoteDate(new Date(2026, 7, 23, 9, 5).getTime(), NOW, 'en-US')).toBe('9:05 AM')
  })

  it('shows month and day for timestamps from this year', () => {
    expect(formatNoteDate(new Date(2026, 2, 4, 12, 0).getTime(), NOW, 'en-US')).toBe('Mar 4')
  })

  it('shows a short numeric date for older timestamps', () => {
    expect(formatNoteDate(new Date(2024, 10, 30).getTime(), NOW, 'en-US')).toBe('11/30/24')
  })

  it('treats yesterday as "this year", not "today"', () => {
    expect(formatNoteDate(new Date(2026, 7, 22, 23, 59).getTime(), NOW, 'en-US')).toBe('Aug 22')
  })
})

describe('formatLongDate', () => {
  it('renders a long date with time', () => {
    expect(formatLongDate(NOW.getTime(), 'en-US')).toBe('August 23, 2026 at 3:45 PM')
  })
})
