import MiniSearch, { type Options, type SearchResult } from 'minisearch'
import type { Note } from '../types'

/** One search result: the matching note id, its relevance score and the document terms that matched. */
export interface SearchHit {
  id: string
  score: number
  /** Terms as they appear in the document (e.g. `hello` for the fuzzy query `helo`) — used for highlighting. */
  terms: string[]
}

/** The subset of a note that gets indexed. */
interface IndexedNote {
  id: string
  title: string
  text: string
}

const INDEX_OPTIONS: Options<IndexedNote> = {
  fields: ['title', 'text'],
  idField: 'id',
  searchOptions: {
    prefix: true,
    fuzzy: 0.2,
    boost: { title: 2 },
    combineWith: 'AND',
  },
}

function toIndexedNote(note: Note): IndexedNote {
  return { id: note.id, title: note.title, text: note.text }
}

function toHit(result: SearchResult): SearchHit {
  return { id: String(result.id), score: result.score, terms: result.terms }
}

/**
 * In-memory full-text index over notes (title + text), backed by MiniSearch.
 * Searches are fuzzy and prefix-based; every query word must match (AND).
 */
export class NotesSearchIndex {
  private index: MiniSearch<IndexedNote>

  constructor() {
    this.index = new MiniSearch(INDEX_OPTIONS)
  }

  /** Rebuilds the index from scratch with the given notes. */
  replaceAll(notes: Note[]): void {
    this.index = new MiniSearch(INDEX_OPTIONS)
    this.index.addAll(notes.map(toIndexedNote))
  }

  /** Adds the note, replacing any previously indexed version with the same id. */
  upsert(note: Note): void {
    this.remove(note.id)
    this.index.add(toIndexedNote(note))
  }

  /** Removes the note with the given id; does nothing if it is not indexed. */
  remove(id: string): void {
    if (this.index.has(id)) this.index.discard(id)
  }

  /** Returns hits sorted by score (descending). An empty or whitespace-only query yields no hits. */
  search(query: string): SearchHit[] {
    if (query.trim().length === 0) return []
    return this.index.search(query).map(toHit)
  }

  /** Number of notes currently in the index. */
  get size(): number {
    return this.index.documentCount
  }
}
