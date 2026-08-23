/** Formatting options for a timestamp from today: `3:45 PM`. */
const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
/** Formatting options for a timestamp from the current year: `Aug 23`. */
const MONTH_DAY_OPTIONS: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
/** Formatting options for older timestamps: `8/23/25`. */
const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { month: 'numeric', day: 'numeric', year: '2-digit' }
/** Formatting options for the editor header: `August 23, 2026 at 3:45 PM`. */
const LONG_DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'long', timeStyle: 'short' }

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * Compact, the time for today,
 * `MMM d` for this year and `M/d/yy` otherwise.
 */
export function formatNoteDate(timestamp: number, now: Date = new Date(), locale?: string): string {
  const date = new Date(timestamp)
  if (isSameDay(date, now)) return new Intl.DateTimeFormat(locale, TIME_OPTIONS).format(date)
  if (date.getFullYear() === now.getFullYear()) return new Intl.DateTimeFormat(locale, MONTH_DAY_OPTIONS).format(date)
  return new Intl.DateTimeFormat(locale, SHORT_DATE_OPTIONS).format(date)
}

/** Full date and time shown above an open note. */
export function formatLongDate(timestamp: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, LONG_DATE_OPTIONS).format(new Date(timestamp))
}
