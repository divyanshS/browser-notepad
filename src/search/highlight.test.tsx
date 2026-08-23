import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildHighlightRegex, highlightText } from './highlight'

function renderHighlight(text: string, terms: string[]) {
  const { container } = render(<span data-testid="host">{highlightText(text, terms)}</span>)
  const host = container.firstElementChild as HTMLElement
  const marks = Array.from(host.querySelectorAll('mark')).map((mark) => mark.textContent)
  return { host, marks }
}

describe('buildHighlightRegex', () => {
  it('returns null when there are no usable terms', () => {
    expect(buildHighlightRegex([])).toBeNull()
    expect(buildHighlightRegex([''])).toBeNull()
  })

  it('is global and case-insensitive', () => {
    const regex = buildHighlightRegex(['hello'])
    expect(regex?.flags).toBe('gi')
    expect('Hello HELLO hello'.match(regex!)).toEqual(['Hello', 'HELLO', 'hello'])
  })

  it('escapes regex-special characters so they match literally', () => {
    for (const term of ['c++', 'a.b', '(x)', '[a-z]', '$1', 'a|b', '\\d']) {
      const regex = buildHighlightRegex([term])
      expect(regex).not.toBeNull()
      expect(`before ${term} after`.match(regex!)).toEqual([term])
    }
    expect('axb'.match(buildHighlightRegex(['a.b'])!)).toBeNull()
  })

  it('prefers longer terms over their substrings', () => {
    const regex = buildHighlightRegex(['wor', 'world'])
    expect('world'.match(regex!)).toEqual(['world'])
  })

  it('dedupes terms case-insensitively', () => {
    expect(buildHighlightRegex(['Hello', 'hello'])?.source).toBe('Hello')
  })
})

describe('highlightText', () => {
  it('returns the plain string unchanged when there are no terms', () => {
    expect(highlightText('hello world', [])).toBe('hello world')
    expect(highlightText('hello world', [''])).toBe('hello world')
  })

  it('returns the plain string unchanged when nothing matches', () => {
    expect(highlightText('hello world', ['xyz'])).toBe('hello world')
  })

  it('wraps every case-insensitive occurrence in a <mark>', () => {
    const { host, marks } = renderHighlight('Hello world, hello again', ['hello'])
    expect(marks).toEqual(['Hello', 'hello'])
    expect(host.textContent).toBe('Hello world, hello again')
    for (const mark of host.querySelectorAll('mark')) {
      expect(mark).toHaveClass('search-highlight')
    }
  })

  it('matches terms anywhere in a word', () => {
    const { marks } = renderHighlight('unworldly', ['world'])
    expect(marks).toEqual(['world'])
  })

  it('highlights the longest term first without nesting marks', () => {
    const { host, marks } = renderHighlight('hello world', ['wor', 'world', 'hello'])
    expect(marks).toEqual(['hello', 'world'])
    expect(host.querySelector('mark mark')).toBeNull()
    expect(host.textContent).toBe('hello world')
  })

  it('handles regex-special characters in terms without throwing', () => {
    const { marks, host } = renderHighlight('I like c++ and a.b and (x)', ['c++', 'a.b', '(x)'])
    expect(marks).toEqual(['c++', 'a.b', '(x)'])
    expect(host.textContent).toBe('I like c++ and a.b and (x)')
  })

  it('preserves text before, between and after matches', () => {
    const { host } = renderHighlight('ab-cd-ab', ['ab'])
    expect(host.innerHTML).toBe(
      '<mark class="search-highlight">ab</mark>-cd-<mark class="search-highlight">ab</mark>',
    )
  })

  it('handles a match spanning the whole text', () => {
    const { host } = renderHighlight('hello', ['hello'])
    expect(host.innerHTML).toBe('<mark class="search-highlight">hello</mark>')
  })
})
