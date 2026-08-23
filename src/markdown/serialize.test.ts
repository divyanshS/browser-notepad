import type { JSONContent } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { docToPlainText, serializeToMarkdown } from './serialize'

type Mark = NonNullable<JSONContent['marks']>[number]

const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content })
const p = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', content })
const h = (level: number | undefined, ...content: JSONContent[]): JSONContent => ({
  type: 'heading',
  attrs: { level },
  content,
})
const t = (text: string, ...marks: Mark[]): JSONContent => (marks.length ? { type: 'text', text, marks } : { type: 'text', text })
const br: JSONContent = { type: 'hardBreak' }
const hr: JSONContent = { type: 'horizontalRule' }
const ul = (...items: JSONContent[]): JSONContent => ({ type: 'bulletList', content: items })
const ol = (start: number | undefined, ...items: JSONContent[]): JSONContent => ({
  type: 'orderedList',
  attrs: { start },
  content: items,
})
const li = (...content: JSONContent[]): JSONContent => ({ type: 'listItem', content })
const bq = (...content: JSONContent[]): JSONContent => ({ type: 'blockquote', content })
const code = (language: string | null, text: string): JSONContent => ({
  type: 'codeBlock',
  attrs: { language },
  content: text === '' ? [] : [t(text)],
})

const bold: Mark = { type: 'bold' }
const italic: Mark = { type: 'italic' }
const strike: Mark = { type: 'strike' }
const underline: Mark = { type: 'underline' }
const codeMark: Mark = { type: 'code' }
const link = (href: string): Mark => ({ type: 'link', attrs: { href, target: '_blank', rel: 'noopener' } })

describe('serializeToMarkdown: document shape', () => {
  it('returns an empty string for an empty document', () => {
    expect(serializeToMarkdown({ type: 'doc' })).toBe('')
    expect(serializeToMarkdown(doc(p()))).toBe('')
    expect(serializeToMarkdown(doc(p(t('   '))))).toBe('')
  })

  it('ends with exactly one newline', () => {
    const md = serializeToMarkdown(doc(p(t('Hello'))))
    expect(md).toBe('Hello\n')
    expect(md.endsWith('\n\n')).toBe(false)
  })

  it('separates blocks with a blank line and skips empty paragraphs', () => {
    expect(serializeToMarkdown(doc(p(t('a')), p(), p(t('b'))))).toBe('a\n\nb\n')
  })

  it('serializes unknown block nodes by rendering their children', () => {
    const md = serializeToMarkdown(doc({ type: 'customBlock', content: [p(t('a')), p(t('b'))] }))
    expect(md).toBe('a\n\nb\n')
  })

  it('serializes unknown inline nodes by rendering their text', () => {
    const mention: JSONContent = { type: 'mention', content: [t('@bob')] }
    const leaf: JSONContent = { type: 'emoji', attrs: { name: 'smile' } }
    expect(serializeToMarkdown(doc(p(t('hi '), mention, leaf)))).toBe('hi @bob\n')
  })
})

describe('serializeToMarkdown: headings', () => {
  it('renders levels 1 to 6', () => {
    for (let level = 1; level <= 6; level++) {
      expect(serializeToMarkdown(doc(h(level, t('Title'))))).toBe(`${'#'.repeat(level)} Title\n`)
    }
  })

  it('clamps missing or out-of-range levels', () => {
    expect(serializeToMarkdown(doc(h(undefined, t('x'))))).toBe('# x\n')
    expect(serializeToMarkdown(doc(h(9, t('x'))))).toBe('###### x\n')
  })

  it('escapes # inside headings so a trailing # is not swallowed', () => {
    expect(serializeToMarkdown(doc(h(2, t('C #'))))).toBe('## C \\#\n')
  })

  it('renders an empty heading as bare hashes', () => {
    expect(serializeToMarkdown(doc(h(1)))).toBe('#\n')
  })
})

describe('serializeToMarkdown: lists', () => {
  it('renders bullet lists', () => {
    expect(serializeToMarkdown(doc(ul(li(p(t('one'))), li(p(t('two'))))))).toBe('- one\n- two\n')
  })

  it('numbers ordered lists sequentially from attrs.start', () => {
    expect(serializeToMarkdown(doc(ol(3, li(p(t('a'))), li(p(t('b'))))))).toBe('3. a\n4. b\n')
    expect(serializeToMarkdown(doc(ol(undefined, li(p(t('a'))))))).toBe('1. a\n')
  })

  it('indents nested bullet lists by two spaces per level', () => {
    const tree = ul(li(p(t('a')), ul(li(p(t('b'))), li(p(t('c')), ul(li(p(t('d'))))))), li(p(t('e'))))
    expect(serializeToMarkdown(doc(tree))).toBe('- a\n  - b\n  - c\n    - d\n- e\n')
  })

  it('indents continuation lines of ordered items to the marker width', () => {
    expect(serializeToMarkdown(doc(ol(1, li(p(t('a')), ul(li(p(t('x'))))))))).toBe('1. a\n   - x\n')
    expect(serializeToMarkdown(doc(ul(li(p(t('a')), ol(1, li(p(t('x'))), li(p(t('y'))))))))).toBe('- a\n  1. x\n  2. y\n')
  })

  it('restarts numbering per list and keeps adjacent lists apart', () => {
    const md = serializeToMarkdown(doc(ol(1, li(p(t('a'))), li(p(t('b')))), ol(1, li(p(t('c'))))))
    expect(md).toBe('1. a\n2. b\n\n1) c\n')
    expect(serializeToMarkdown(doc(ul(li(p(t('a')))), ul(li(p(t('b'))))))).toBe('- a\n\n* b\n')
    const separated = doc(ol(1, li(p(t('a')))), p(t('between')), ol(1, li(p(t('c')))))
    expect(serializeToMarkdown(separated)).toBe('1. a\n\nbetween\n\n1. c\n')
  })

  it('renders empty items without trailing spaces', () => {
    expect(serializeToMarkdown(doc(ul(li(p()), li(p(t('b'))))))).toBe('-\n- b\n')
  })

  it('separates multiple blocks inside an item with a blank line, indented', () => {
    expect(serializeToMarkdown(doc(ul(li(p(t('a')), p(t('b'))))))).toBe('- a\n\n  b\n')
    expect(serializeToMarkdown(doc(ul(li(p(t('a')), code(null, 'x\n\ny')))))).toBe('- a\n\n  ```\n  x\n\n  y\n  ```\n')
  })

  it('escapes block syntax at the start of an item', () => {
    expect(serializeToMarkdown(doc(ul(li(p(t('# not a heading'))))))).toBe('- \\# not a heading\n')
    expect(serializeToMarkdown(doc(ul(li(p(t('1. not nested'))))))).toBe('- 1\\. not nested\n')
  })
})

describe('serializeToMarkdown: blockquotes', () => {
  it('prefixes every line with > ', () => {
    expect(serializeToMarkdown(doc(bq(p(t('quoted')))))).toBe('> quoted\n')
    expect(serializeToMarkdown(doc(bq(p(t('a')), p(t('b')))))).toBe('> a\n>\n> b\n')
  })

  it('nests blockquotes', () => {
    expect(serializeToMarkdown(doc(bq(bq(p(t('inner'))))))).toBe('> > inner\n')
  })

  it('wraps a nested list inside a blockquote', () => {
    const quote = bq(p(t('intro')), ul(li(p(t('a')), ul(li(p(t('b'))))), li(p(t('c')))), p(t('after')))
    expect(serializeToMarkdown(doc(quote))).toBe('> intro\n>\n> - a\n>   - b\n> - c\n>\n> after\n')
  })

  it('drops an empty blockquote', () => {
    expect(serializeToMarkdown(doc(bq(p())))).toBe('')
  })
})

describe('serializeToMarkdown: code blocks and rules', () => {
  it('fences code without escaping its content', () => {
    const md = serializeToMarkdown(doc(code('ts', 'const x = `a` // **not bold** <b>')))
    expect(md).toBe('```ts\nconst x = `a` // **not bold** <b>\n```\n')
  })

  it('omits the language when absent', () => {
    expect(serializeToMarkdown(doc(code(null, 'x')))).toBe('```\nx\n```\n')
  })

  it('uses a longer fence when the code contains triple backticks', () => {
    expect(serializeToMarkdown(doc(code(null, 'a\n```\nb')))).toBe('````\na\n```\nb\n````\n')
  })

  it('renders an empty code block', () => {
    expect(serializeToMarkdown(doc(code('js', '')))).toBe('```js\n```\n')
  })

  it('renders horizontal rules', () => {
    expect(serializeToMarkdown(doc(hr))).toBe('---\n')
    expect(serializeToMarkdown(doc(p(t('a')), hr, p(t('b'))))).toBe('a\n\n---\n\nb\n')
  })
})

describe('serializeToMarkdown: hard breaks', () => {
  it('renders a hard break as two trailing spaces and a newline', () => {
    expect(serializeToMarkdown(doc(p(t('a'), br, t('b'))))).toBe('a  \nb\n')
  })

  it('drops breaks at the edges of a paragraph', () => {
    expect(serializeToMarkdown(doc(p(br, t('a'), br)))).toBe('a\n')
  })

  it('keeps consecutive breaks from producing a blank line', () => {
    expect(serializeToMarkdown(doc(p(t('a'), br, br, t('b'))))).toBe('a  \n\\\nb\n')
  })

  it('escapes block syntax on the line after a break', () => {
    expect(serializeToMarkdown(doc(p(t('a'), br, t('- not a list'))))).toBe('a  \n\\- not a list\n')
  })

  it('closes marks around a break', () => {
    expect(serializeToMarkdown(doc(p(t('a', bold), br, t('b', bold))))).toBe('**a**  \n**b**\n')
  })

  it('turns a break inside a heading into a space', () => {
    expect(serializeToMarkdown(doc(h(1, t('a'), br, t('b'))))).toBe('# a b\n')
  })
})

describe('serializeToMarkdown: marks', () => {
  it('renders each mark', () => {
    expect(serializeToMarkdown(doc(p(t('b', bold))))).toBe('**b**\n')
    expect(serializeToMarkdown(doc(p(t('i', italic))))).toBe('*i*\n')
    expect(serializeToMarkdown(doc(p(t('s', strike))))).toBe('~~s~~\n')
    expect(serializeToMarkdown(doc(p(t('u', underline))))).toBe('<u>u</u>\n')
    expect(serializeToMarkdown(doc(p(t('c', codeMark))))).toBe('`c`\n')
    expect(serializeToMarkdown(doc(p(t('text', link('https://example.com')))))).toBe('[text](https://example.com)\n')
  })

  it('nests bold and italic deterministically regardless of mark order', () => {
    expect(serializeToMarkdown(doc(p(t('both', bold, italic))))).toBe('***both***\n')
    expect(serializeToMarkdown(doc(p(t('both', italic, bold))))).toBe('***both***\n')
  })

  it('shares delimiters across consecutive runs', () => {
    const md = serializeToMarkdown(doc(p(t('bold ', bold), t('and italic', bold, italic), t(' bold', bold))))
    expect(md).toBe('**bold *and italic* bold**\n')
  })

  it('closes and reopens marks when the nesting changes', () => {
    const md = serializeToMarkdown(doc(p(t('a', bold, italic), t(' '), t('b', italic))))
    expect(md).toBe('***a*** *b*\n')
  })

  it('moves leading and trailing whitespace outside the delimiters', () => {
    expect(serializeToMarkdown(doc(p(t('bold ', bold), t('plain'))))).toBe('**bold** plain\n')
    expect(serializeToMarkdown(doc(p(t('a'), t('  b ', bold), t('c'))))).toBe('a  **b** c\n')
    expect(serializeToMarkdown(doc(p(t(' lead', italic))))).toBe('*lead*\n')
    expect(serializeToMarkdown(doc(p(t('   ', bold))))).toBe('')
  })

  it('keeps code innermost and links outermost', () => {
    expect(serializeToMarkdown(doc(p(t('c', bold, codeMark))))).toBe('**`c`**\n')
    expect(serializeToMarkdown(doc(p(t('b', bold, link('https://x.y')))))).toBe('[**b**](https://x.y)\n')
  })

  it('lengthens the code fence when the text contains backticks', () => {
    expect(serializeToMarkdown(doc(p(t('a`b', codeMark))))).toBe('``a`b``\n')
    expect(serializeToMarkdown(doc(p(t('`x', codeMark))))).toBe('`` `x ``\n')
    expect(serializeToMarkdown(doc(p(t(' x ', codeMark))))).toBe('`  x  `\n')
  })

  it('does not escape code span content', () => {
    expect(serializeToMarkdown(doc(p(t('*a*_b_', codeMark))))).toBe('`*a*_b_`\n')
  })

  it('escapes unsafe characters in link destinations', () => {
    const md = serializeToMarkdown(doc(p(t('t', link('https://e.com/a b(1)')))))
    expect(md).toBe('[t](https://e.com/a%20b\\(1\\))\n')
  })

  it('separates adjacent links with different destinations', () => {
    const md = serializeToMarkdown(doc(p(t('a', link('https://a')), t('b', link('https://b')))))
    expect(md).toBe('[a](https://a)[b](https://b)\n')
  })

  it('renders a link without an href as plain text and ignores unknown marks', () => {
    expect(serializeToMarkdown(doc(p(t('x', { type: 'link', attrs: { href: '' } }))))).toBe('x\n')
    expect(serializeToMarkdown(doc(p(t('x', { type: 'textStyle', attrs: { color: 'red' } }))))).toBe('x\n')
  })
})

describe('serializeToMarkdown: escaping', () => {
  it('escapes Markdown-significant characters in plain text', () => {
    const md = serializeToMarkdown(doc(p(t('a*b_c`d[e]f<g>h\\i~j'))))
    expect(md).toBe('a\\*b\\_c\\`d\\[e\\]f\\<g>h\\\\i\\~j\n')
  })

  it('escapes block syntax only at line start', () => {
    expect(serializeToMarkdown(doc(p(t('# x'))))).toBe('\\# x\n')
    expect(serializeToMarkdown(doc(p(t('> x'))))).toBe('\\> x\n')
    expect(serializeToMarkdown(doc(p(t('- x'))))).toBe('\\- x\n')
    expect(serializeToMarkdown(doc(p(t('+ x'))))).toBe('\\+ x\n')
    expect(serializeToMarkdown(doc(p(t('---'))))).toBe('\\---\n')
    expect(serializeToMarkdown(doc(p(t('a # b - c > d'))))).toBe('a # b - c > d\n')
  })

  it('escapes ordered list markers only when they would start a list', () => {
    expect(serializeToMarkdown(doc(p(t('1. x'))))).toBe('1\\. x\n')
    expect(serializeToMarkdown(doc(p(t('2) x'))))).toBe('2\\) x\n')
    expect(serializeToMarkdown(doc(p(t('3.'))))).toBe('3\\.\n')
    expect(serializeToMarkdown(doc(p(t('1.5 x'))))).toBe('1.5 x\n')
  })

  it('strips leading whitespace that would form an indented code block', () => {
    expect(serializeToMarkdown(doc(p(t('      code?'))))).toBe('code?\n')
  })
})

describe('docToPlainText', () => {
  it('joins text blocks with newlines and turns hard breaks into newlines', () => {
    const tree = doc(
      h(1, t('Title')),
      p(t('a', bold), br, t('b')),
      ul(li(p(t('x'))), li(p(t('y')), ul(li(p(t('z')))))),
      bq(p(t('q'))),
      code('ts', 'const n = 1'),
      hr,
    )
    expect(docToPlainText(tree)).toBe('Title\na\nb\nx\ny\nz\nq\nconst n = 1')
  })

  it('keeps empty paragraphs as empty lines', () => {
    expect(docToPlainText(doc(p(t('a')), p(), p(t('b'))))).toBe('a\n\nb')
  })

  it('returns an empty string for an empty document', () => {
    expect(docToPlainText({ type: 'doc' })).toBe('')
    expect(docToPlainText(doc(p()))).toBe('')
  })

  it('does not escape anything', () => {
    expect(docToPlainText(doc(p(t('*a* # b'))))).toBe('*a* # b')
  })
})
