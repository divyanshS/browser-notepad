import type { JSONContent } from '@tiptap/core'

type JSONMark = NonNullable<JSONContent['marks']>[number]

/** A mark rendered with open/close delimiters that may span several text nodes. */
interface NestableMark {
  type: string
  /** Only set for `link` marks. */
  href?: string
}

interface TextRun {
  kind: 'text'
  text: string
  /** Outermost first. Never contains `code`, which is tracked separately. */
  marks: NestableMark[]
  code: boolean
}

interface BreakRun {
  kind: 'break'
}

type InlineRun = TextRun | BreakRun

interface InlineOptions {
  /** Emitted for a hard break. */
  hardBreak: string
  /** Emitted for a hard break that directly follows another one. */
  repeatedHardBreak: string
  /** Escape `#` everywhere, not only at line start (ATX headings strip a trailing `#` run). */
  escapeHash: boolean
}

interface RenderedBlock {
  type: string
  text: string
}

const PARAGRAPH_INLINE: InlineOptions = { hardBreak: '  \n', repeatedHardBreak: '\\\n', escapeHash: false }
const HEADING_INLINE: InlineOptions = { hardBreak: ' ', repeatedHardBreak: '', escapeHash: true }

/** Nesting order of mark delimiters, outermost first. Marks not listed here are dropped. */
const MARK_RANK = new Map<string, number>([
  ['link', 0],
  ['bold', 1],
  ['italic', 2],
  ['strike', 3],
  ['underline', 4],
])

const MARK_DELIMITERS = new Map<string, readonly [open: string, close: string]>([
  ['bold', ['**', '**']],
  ['italic', ['*', '*']],
  ['strike', ['~~', '~~']],
  ['underline', ['<u>', '</u>']],
])

const LIST_TYPES = new Set(['bulletList', 'orderedList'])
const TEXTBLOCK_TYPES = new Set(['paragraph', 'heading', 'codeBlock'])

/**
 * Serializes a Tiptap/ProseMirror document to GitHub-flavoured Markdown.
 *
 * Blocks are separated by a blank line, list continuation lines are indented to the
 * marker width (2 spaces for bullets), code blocks are fenced and never escaped, and
 * Markdown-significant characters in ordinary text are backslash-escaped. Adjacent
 * lists of the same kind alternate their marker (`-`/`*`, `1.`/`1)`) so they stay
 * separate lists. The result ends with exactly one newline; an empty document yields `''`.
 */
export function serializeToMarkdown(doc: JSONContent): string {
  const body = joinBlocks(renderBlocks(children(doc)))
  return body === '' ? '' : `${body}\n`
}

/**
 * Plain-text projection of a document: one line per text block (paragraph, heading,
 * code block), joined with `\n`; hard breaks become `\n`.
 */
export function docToPlainText(doc: JSONContent): string {
  const lines: string[] = []
  collectPlainLines(doc, lines)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------

function collectPlainLines(node: JSONContent, lines: string[]): void {
  if (TEXTBLOCK_TYPES.has(node.type ?? '') || hasInlineChildren(node)) {
    lines.push(inlinePlainText(children(node)))
    return
  }
  for (const child of children(node)) collectPlainLines(child, lines)
}

function inlinePlainText(nodes: JSONContent[]): string {
  return nodes
    .map((node) => (node.type === 'hardBreak' ? '\n' : (node.text ?? inlinePlainText(children(node)))))
    .join('')
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/** Renders sibling blocks, dropping empty ones and alternating markers of adjacent same-kind lists. */
function renderBlocks(nodes: JSONContent[]): RenderedBlock[] {
  const rendered: RenderedBlock[] = []
  let listVariant = 0
  for (const node of nodes) {
    const type = node.type ?? ''
    const previous = rendered.at(-1)
    listVariant = LIST_TYPES.has(type) && previous?.type === type ? 1 - listVariant : 0
    const text = renderBlock(node, listVariant)
    if (text !== '') rendered.push({ type, text })
  }
  return rendered
}

function joinBlocks(blocks: RenderedBlock[]): string {
  return blocks.map((block) => block.text).join('\n\n')
}

function renderBlock(node: JSONContent, listVariant: number): string {
  switch (node.type) {
    case 'paragraph':
      return renderInline(children(node), PARAGRAPH_INLINE)
    case 'heading':
      return renderHeading(node)
    case 'bulletList':
      return renderList(node, () => (listVariant === 0 ? '- ' : '* '))
    case 'orderedList':
      return renderOrderedList(node, listVariant)
    case 'blockquote':
      return renderBlockquote(node)
    case 'codeBlock':
      return renderCodeBlock(node)
    case 'horizontalRule':
      return '---'
    default:
      return renderUnknownBlock(node)
  }
}

function renderHeading(node: JSONContent): string {
  const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1))
  const hashes = '#'.repeat(level)
  const text = renderInline(children(node), HEADING_INLINE)
  return text === '' ? hashes : `${hashes} ${text}`
}

function renderOrderedList(node: JSONContent, listVariant: number): string {
  const start = Number(node.attrs?.start) || 1
  const delimiter = listVariant === 0 ? '.' : ')'
  return renderList(node, (index) => `${start + index}${delimiter} `)
}

function renderList(node: JSONContent, markerFor: (index: number) => string): string {
  return children(node)
    .map((item, index) => renderListItem(item, markerFor(index)))
    .join('\n')
}

/** Puts the marker on the item's first line and indents the rest to the marker's width. */
function renderListItem(item: JSONContent, marker: string): string {
  return prefixLines(renderListItemBody(item), marker, ' '.repeat(marker.length))
}

/** A nested list hugs the paragraph before it (tight list); other blocks get a blank line. */
function renderListItemBody(item: JSONContent): string {
  let body = ''
  for (const block of renderBlocks(children(item))) {
    if (body !== '') body += LIST_TYPES.has(block.type) ? '\n' : '\n\n'
    body += block.text
  }
  return body
}

function renderBlockquote(node: JSONContent): string {
  const inner = joinBlocks(renderBlocks(children(node)))
  return inner === '' ? '' : prefixLines(inner, '> ', '> ')
}

function renderCodeBlock(node: JSONContent): string {
  const code = inlinePlainText(children(node))
  const language = String(node.attrs?.language ?? '').replace(/[`\s]/g, '')
  const fence = '`'.repeat(Math.max(3, longestBacktickRun(code) + 1))
  const lines = code === '' ? [] : [code]
  return [fence + language, ...lines, fence].join('\n')
}

/** Unknown nodes: text-like content becomes a paragraph, anything else is a transparent container. */
function renderUnknownBlock(node: JSONContent): string {
  if (node.text !== undefined) return renderInline([node], PARAGRAPH_INLINE)
  if (hasInlineChildren(node)) return renderInline(children(node), PARAGRAPH_INLINE)
  return joinBlocks(renderBlocks(children(node)))
}

/** Prefixes every line; a prefix on an empty line is trimmed so no trailing spaces are emitted. */
function prefixLines(text: string, first: string, rest: string): string {
  return text
    .split('\n')
    .map((line, index) => {
      const prefix = index === 0 ? first : rest
      return line === '' ? prefix.trimEnd() : prefix + line
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// Inline content
// ---------------------------------------------------------------------------

function renderInline(nodes: JSONContent[], options: InlineOptions): string {
  return nestRuns(mergeRuns(collectRuns(nodes, [])), options)
}

function collectRuns(nodes: JSONContent[], runs: InlineRun[]): InlineRun[] {
  for (const node of nodes) {
    if (node.type === 'hardBreak') runs.push({ kind: 'break' })
    else if (node.text !== undefined) runs.push(textRun(node.text, node.marks ?? []))
    else collectRuns(children(node), runs)
  }
  return runs
}

function textRun(text: string, marks: JSONMark[]): TextRun {
  return {
    kind: 'text',
    text,
    marks: nestableMarks(marks),
    code: marks.some((mark) => mark.type === 'code'),
  }
}

/** Keeps the known delimiter marks (links need an href), sorted outermost first. */
function nestableMarks(marks: JSONMark[]): NestableMark[] {
  return marks
    .filter((mark) => MARK_RANK.has(mark.type))
    .flatMap((mark): NestableMark[] => {
      if (mark.type !== 'link') return [{ type: mark.type }]
      const href: unknown = mark.attrs?.href
      return typeof href === 'string' && href !== '' ? [{ type: 'link', href }] : []
    })
    .sort((a, b) => (MARK_RANK.get(a.type) ?? 0) - (MARK_RANK.get(b.type) ?? 0))
}

/** Joins adjacent text runs carrying the same marks so escaping sees whole words. */
function mergeRuns(runs: InlineRun[]): InlineRun[] {
  const out: InlineRun[] = []
  for (const run of runs) {
    const last = out.at(-1)
    if (run.kind === 'text' && last?.kind === 'text' && last.code === run.code && sameMarks(last.marks, run.marks)) {
      out[out.length - 1] = { ...last, text: last.text + run.text }
    } else {
      out.push(run)
    }
  }
  return out
}

/** Splits a run into its surrounding whitespace and its core; code spans keep their whitespace. */
function splitWhitespace(run: TextRun): { lead: string; core: string; trail: string } {
  if (run.code) return { lead: '', core: run.text, trail: '' }
  const core = run.text.trim()
  const lead = run.text.slice(0, run.text.length - run.text.trimStart().length)
  const trail = core === '' ? '' : run.text.slice(run.text.trimEnd().length)
  return { lead, core, trail }
}

function breakString(count: number, options: InlineOptions): string {
  return options.hardBreak + options.repeatedHardBreak.repeat(count - 1)
}

/**
 * Emits the runs while opening and closing mark delimiters so that they nest
 * properly and are shared across consecutive runs (`**bold *and italic* bold**`).
 * Whitespace touching a delimiter is moved between the closing and opening
 * delimiters (`**bold** next`, never `**bold **`), whitespace at line edges and
 * hard breaks at block edges are dropped.
 */
function nestRuns(runs: InlineRun[], options: InlineOptions): string {
  let out = ''
  const active: NestableMark[] = []
  const closeDownTo = (keep: number): void => {
    while (active.length > keep) {
      const mark = active[active.length - 1]
      active.pop()
      out += closeMark(mark)
    }
  }

  let pendingBreaks = 0
  let pendingSpace = ''
  for (const run of runs) {
    if (run.kind === 'break') {
      pendingBreaks++
      pendingSpace = ''
      continue
    }
    const { lead, core, trail } = splitWhitespace(run)
    if (core === '') {
      pendingSpace += lead
      continue
    }
    const atLineStart = out === '' || pendingBreaks > 0
    if (out !== '' && pendingBreaks > 0) {
      closeDownTo(0)
      out += breakString(pendingBreaks, options)
    }
    const marks = alignWithActive(run.marks, active)
    const keep = sharedPrefixLength(active, marks)
    closeDownTo(keep)
    if (!atLineStart) out += pendingSpace + lead
    for (const mark of marks.slice(keep)) {
      active.push(mark)
      out += openMark(mark)
    }
    out += renderTextRun(core, run.code, atLineStart, options)
    pendingSpace = trail
    pendingBreaks = 0
  }
  closeDownTo(0)
  return out
}

/** Number of leading marks that `active` and `marks` have in common, i.e. that can stay open. */
function sharedPrefixLength(active: NestableMark[], marks: NestableMark[]): number {
  let keep = 0
  while (keep < active.length && keep < marks.length && sameMark(active[keep], marks[keep])) keep++
  return keep
}

/** Reorders `marks` so that as many as possible line up with the currently open marks. */
function alignWithActive(marks: NestableMark[], active: NestableMark[]): NestableMark[] {
  const aligned = [...marks]
  for (let i = 0; i < active.length && i < aligned.length; i++) {
    const j = aligned.findIndex((mark, index) => index >= i && sameMark(mark, active[i]))
    if (j === -1) break
    ;[aligned[i], aligned[j]] = [aligned[j], aligned[i]]
  }
  return aligned
}

function openMark(mark: NestableMark): string {
  return mark.type === 'link' ? '[' : (MARK_DELIMITERS.get(mark.type)?.[0] ?? '')
}

function closeMark(mark: NestableMark): string {
  return mark.type === 'link' ? `](${escapeHref(mark.href ?? '')})` : (MARK_DELIMITERS.get(mark.type)?.[1] ?? '')
}

function renderTextRun(text: string, code: boolean, atLineStart: boolean, options: InlineOptions): string {
  if (code) return codeSpan(text)
  const escaped = escapeText(text, options.escapeHash)
  return atLineStart ? escapeLineStart(escaped) : escaped
}

// ---------------------------------------------------------------------------
// Escaping
// ---------------------------------------------------------------------------

function escapeText(text: string, escapeHash: boolean): string {
  const escaped = text.replace(/[\\*_`[\]<~]/g, '\\$&')
  return escapeHash ? escaped.replace(/#/g, '\\#') : escaped
}

/** Neutralises headings, quotes, bullets, setext underlines and `1.` / `1)` list markers. */
function escapeLineStart(text: string): string {
  return text.replace(/^[#>+\-=]/, '\\$&').replace(/^(\d{1,9})([.)])(?=\s|$)/, '$1\\$2')
}

function escapeHref(href: string): string {
  return href.replace(/\s/g, '%20').replace(/[()<>]/g, '\\$&')
}

/** Wraps text in a backtick fence longer than any backtick run inside; pads when the edges are ambiguous. */
function codeSpan(text: string): string {
  const fence = '`'.repeat(longestBacktickRun(text) + 1)
  const pad = /^[` ]|[` ]$/.test(text) ? ' ' : ''
  return `${fence}${pad}${text}${pad}${fence}`
}

function longestBacktickRun(text: string): number {
  let longest = 0
  for (const match of text.matchAll(/`+/g)) longest = Math.max(longest, match[0].length)
  return longest
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function children(node: JSONContent): JSONContent[] {
  return node.content ?? []
}

function hasInlineChildren(node: JSONContent): boolean {
  return children(node).some((child) => child.type === 'hardBreak' || child.text !== undefined)
}

function sameMark(a: NestableMark, b: NestableMark): boolean {
  return a.type === b.type && a.href === b.href
}

function sameMarks(a: NestableMark[], b: NestableMark[]): boolean {
  return a.length === b.length && a.every((mark, index) => sameMark(mark, b[index]))
}
