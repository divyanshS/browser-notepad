import { describe, expect, it } from 'vitest'
import type { Note } from '../types'
import { NotesSearchIndex } from './searchIndex'

function makeNote(id: string, title: string, body = ''): Note {
  const text = body ? `${title}\n${body}` : title
  return {
    id,
    folderId: null,
    title,
    text,
    content: { type: 'doc', content: [] },
    createdAt: 1,
    updatedAt: 1,
  }
}

function indexOf(...notes: Note[]): NotesSearchIndex {
  const index = new NotesSearchIndex()
  index.replaceAll(notes)
  return index
}

describe('NotesSearchIndex', () => {
  it('returns [] for an empty or whitespace-only query', () => {
    const index = indexOf(makeNote('a', 'hello world'))
    expect(index.search('')).toEqual([])
    expect(index.search('   \n\t')).toEqual([])
  })

  it('matches exact words and reports the matched document terms', () => {
    const index = indexOf(makeNote('a', 'Grocery list', 'milk eggs bread'))
    const hits = index.search('eggs')
    expect(hits.map((hit) => hit.id)).toEqual(['a'])
    expect(hits[0].terms).toEqual(['eggs'])
    expect(hits[0].score).toBeGreaterThan(0)
  })

  it('fuzzy-matches typos in every word of a multi-word query', () => {
    const index = indexOf(makeNote('a', 'Greeting', 'hello world'), makeNote('b', 'Other', 'nothing here'))
    const hits = index.search('helo wrld')
    expect(hits.map((hit) => hit.id)).toEqual(['a'])
    expect([...hits[0].terms].sort()).toEqual(['hello', 'world'])
  })

  it('prefix-matches partial words', () => {
    const index = indexOf(makeNote('a', 'Greeting', 'hello world'))
    const hits = index.search('wor')
    expect(hits.map((hit) => hit.id)).toEqual(['a'])
    expect(hits[0].terms).toEqual(['world'])
  })

  it('requires every query word to match (AND)', () => {
    const index = indexOf(makeNote('a', 'Greeting', 'hello world'), makeNote('b', 'Farewell', 'goodbye world'))
    expect(index.search('hello world').map((hit) => hit.id)).toEqual(['a'])
    expect(index.search('hello goodbye')).toEqual([])
  })

  it('ranks title matches above body-only matches', () => {
    const index = indexOf(
      makeNote('body', 'Weekly plan', 'remember to review the budget spreadsheet'),
      makeNote('title', 'Budget', 'numbers'),
    )
    const hits = index.search('budget')
    expect(hits.map((hit) => hit.id)).toEqual(['title', 'body'])
    expect(hits[0].score).toBeGreaterThan(hits[1].score)
  })

  it('replaceAll rebuilds from scratch, dropping previously indexed notes', () => {
    const index = indexOf(makeNote('a', 'alpha'), makeNote('b', 'beta'))
    expect(index.size).toBe(2)
    index.replaceAll([makeNote('c', 'gamma')])
    expect(index.size).toBe(1)
    expect(index.search('alpha')).toEqual([])
    expect(index.search('gamma').map((hit) => hit.id)).toEqual(['c'])
  })

  it('upsert adds a new note and replaces an existing one', () => {
    const index = new NotesSearchIndex()
    index.upsert(makeNote('a', 'apples'))
    expect(index.size).toBe(1)
    expect(index.search('apples').map((hit) => hit.id)).toEqual(['a'])

    index.upsert(makeNote('a', 'oranges'))
    expect(index.size).toBe(1)
    expect(index.search('apples')).toEqual([])
    expect(index.search('oranges').map((hit) => hit.id)).toEqual(['a'])
  })

  it('remove deletes a note and is a no-op for unknown ids', () => {
    const index = indexOf(makeNote('a', 'alpha'))
    index.remove('a')
    expect(index.size).toBe(0)
    expect(index.search('alpha')).toEqual([])

    expect(() => index.remove('a')).not.toThrow()
    expect(() => index.remove('missing')).not.toThrow()
    expect(index.size).toBe(0)
  })

  it('sorts hits by score descending', () => {
    const index = indexOf(
      makeNote('once', 'Notes', 'cat sat on the mat'),
      makeNote('many', 'Notes', 'cat cat cat cat chased the other cat'),
    )
    const scores = index.search('cat').map((hit) => hit.score)
    expect(scores.length).toBe(2)
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1])
  })
})
