import { describe, expect, it } from 'vitest'
import {
  createMediaRejectionProps,
  shouldRejectDrop,
  shouldSwallowPaste,
  stripMediaFromHtml,
} from './pasteRules'

describe('stripMediaFromHtml', () => {
  it('returns text-only HTML unchanged', () => {
    const html = '<p>Hello <strong>world</strong></p>'
    expect(stripMediaFromHtml(html)).toBe(html)
  })

  it('removes <img> tags in every form', () => {
    expect(stripMediaFromHtml('<p>a<img src="x.png">b</p>')).toBe('<p>ab</p>')
    expect(stripMediaFromHtml('<p>a<img src="x.png" />b</p>')).toBe('<p>ab</p>')
    expect(stripMediaFromHtml('<p>a<IMG\n  SRC="x.png"\n  alt="y">b</p>')).toBe('<p>ab</p>')
    expect(stripMediaFromHtml('<p>a<img src="data:image/png;base64,AAAA">b</p>')).toBe('<p>ab</p>')
  })

  it('removes <picture>, <video> and <audio> including their children', () => {
    expect(
      stripMediaFromHtml(
        '<p>x</p><picture><source srcset="a.webp"><img src="a.jpg"></picture><p>y</p>',
      ),
    ).toBe('<p>x</p><p>y</p>')
    expect(
      stripMediaFromHtml('<video controls><source src="a.mp4"><track src="a.vtt">fallback</video>'),
    ).toBe('')
    expect(stripMediaFromHtml('<AUDIO src="a.mp3"></AUDIO>')).toBe('')
  })

  it('removes unclosed media tags and stray <source> / <track> tags', () => {
    expect(stripMediaFromHtml('<p>a</p><video src="a.mp4"><p>b</p>')).toBe('<p>a</p><p>b</p>')
    expect(stripMediaFromHtml('<source src="a.mp4"><track src="a.vtt">text')).toBe('text')
  })

  it('does not touch tags that merely start with a media tag name', () => {
    const html = '<imgwrapper>keep</imgwrapper><p>audio and video words</p>'
    expect(stripMediaFromHtml(html)).toBe(html)
  })
})

function fakeTransfer(files: Array<{ type: string }>, data: Record<string, string> = {}): DataTransfer {
  const list = Object.assign(files, { item: (i: number) => files[i] ?? null })
  return {
    files: list as unknown as FileList,
    getData: (format: string) => data[format] ?? '',
  } as unknown as DataTransfer
}

describe('shouldSwallowPaste', () => {
  it('swallows image-only pastes', () => {
    expect(shouldSwallowPaste(fakeTransfer([{ type: 'image/png' }]))).toBe(true)
  })

  it('lets pastes through that carry text alongside files', () => {
    expect(shouldSwallowPaste(fakeTransfer([{ type: 'image/png' }], { 'text/plain': 'hi' }))).toBe(false)
    expect(shouldSwallowPaste(fakeTransfer([{ type: 'image/png' }], { 'text/html': '<p>hi</p>' }))).toBe(
      false,
    )
  })

  it('lets plain text and non-image files through', () => {
    expect(shouldSwallowPaste(fakeTransfer([], { 'text/plain': 'hi' }))).toBe(false)
    expect(shouldSwallowPaste(fakeTransfer([{ type: 'text/plain' }]))).toBe(false)
    expect(shouldSwallowPaste(null)).toBe(false)
  })
})

describe('shouldRejectDrop', () => {
  it('rejects any drop that carries files', () => {
    expect(shouldRejectDrop(fakeTransfer([{ type: 'image/png' }]))).toBe(true)
    expect(shouldRejectDrop(fakeTransfer([{ type: 'application/pdf' }]))).toBe(true)
  })

  it('allows drops without files (e.g. dragged text)', () => {
    expect(shouldRejectDrop(fakeTransfer([], { 'text/plain': 'hi' }))).toBe(false)
    expect(shouldRejectDrop(null)).toBe(false)
  })
})

describe('createMediaRejectionProps', () => {
  it('wires the helpers into ProseMirror editor props', () => {
    const props = createMediaRejectionProps()
    const view = {} as never
    const slice = {} as never
    expect(props.transformPastedHTML?.call(props, '<p>a<img src="x"></p>', view)).toBe('<p>a</p>')
    expect(
      props.handlePaste?.call(props, view, { clipboardData: fakeTransfer([{ type: 'image/gif' }]) } as ClipboardEvent, slice),
    ).toBe(true)
    expect(
      props.handleDrop?.call(props, view, { dataTransfer: fakeTransfer([{ type: 'image/gif' }]) } as DragEvent, slice, false),
    ).toBe(true)
    expect(
      props.handleDrop?.call(props, view, { dataTransfer: fakeTransfer([]) } as DragEvent, slice, false),
    ).toBe(false)
  })
})
