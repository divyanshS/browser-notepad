import type { EditorProps } from '@tiptap/pm/view'

/** Media elements that are removed together with their inner content (e.g. `<source>` children). */
const MEDIA_CONTAINER_TAGS = ['picture', 'video', 'audio'] as const

const CONTAINER_PATTERN = new RegExp(
  `<(${MEDIA_CONTAINER_TAGS.join('|')})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`,
  'gi',
)
/** Stray or unclosed media tags left after removing well-formed containers. */
const STRAY_TAG_PATTERN = new RegExp(
  `<\\/?(img|${MEDIA_CONTAINER_TAGS.join('|')}|source|track)\\b[^>]*\\/?>`,
  'gi',
)

/**
 * Removes `<img>`, `<picture>`, `<video>` and `<audio>` elements (and their inner content)
 * from pasted HTML so images and other media never reach the editor.
 */
export function stripMediaFromHtml(html: string): string {
  return html.replace(CONTAINER_PATTERN, '').replace(STRAY_TAG_PATTERN, '')
}

function hasImageFile(files: FileList | undefined | null): boolean {
  if (!files) return false
  return Array.from(files).some((file) => file.type.startsWith('image/'))
}

function hasTextPayload(data: DataTransfer): boolean {
  return data.getData('text/plain').length > 0 || data.getData('text/html').length > 0
}

/**
 * True when a paste carries only image files (no text/HTML payload) and should be swallowed.
 */
export function shouldSwallowPaste(data: DataTransfer | null): boolean {
  if (!data) return false
  return hasImageFile(data.files) && !hasTextPayload(data)
}

/** True when a drop carries any files — file drops are rejected entirely. */
export function shouldRejectDrop(data: DataTransfer | null): boolean {
  return (data?.files.length ?? 0) > 0
}

/**
 * ProseMirror editor props that reject images and other media on paste and drop.
 * Returning `true` from a handler tells ProseMirror the event was handled, so nothing is inserted.
 */
export function createMediaRejectionProps(): Pick<
  EditorProps,
  'transformPastedHTML' | 'handlePaste' | 'handleDrop'
> {
  return {
    transformPastedHTML: (html) => stripMediaFromHtml(html),
    handlePaste: (_view, event) => shouldSwallowPaste(event.clipboardData),
    handleDrop: (_view, event) => shouldRejectDrop(event.dataTransfer),
  }
}
