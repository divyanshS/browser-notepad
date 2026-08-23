import type { JSONContent } from '@tiptap/core'
import { docToPlainText } from '../markdown/serialize'

/** Builds a plain text node, optionally wrapped in inline `code`. */
function text(value: string, code = false): JSONContent {
  return code ? { type: 'text', text: value, marks: [{ type: 'code' }] } : { type: 'text', text: value }
}

/** Builds a bold text node. */
function bold(value: string): JSONContent {
  return { type: 'text', text: value, marks: [{ type: 'bold' }] }
}

function heading(level: 1 | 2, value: string): JSONContent {
  return { type: 'heading', attrs: { level }, content: [text(value)] }
}

function paragraph(...inline: JSONContent[]): JSONContent {
  return { type: 'paragraph', content: inline }
}

function bulletList(...items: JSONContent[][]): JSONContent {
  return {
    type: 'bulletList',
    content: items.map((inline) => ({ type: 'listItem', content: [paragraph(...inline)] })),
  }
}

/** Tiptap JSON document for the note seeded on first launch. */
export const welcomeNoteContent: JSONContent = {
  type: 'doc',
  content: [
    heading(1, 'Welcome to Notes'),
    paragraph(
      text('A simple place to write. Notes are saved automatically as you type, and everything stays in '),
      bold('this browser'),
      text(' (IndexedDB) — nothing is uploaded anywhere.'),
    ),
    heading(2, 'Markdown shortcuts'),
    paragraph(text('Type these at the start of a line, followed by a space:')),
    bulletList(
      [text('#', true), text(' or '), text('##', true), text(' for headings')],
      [text('-', true), text(' or '), text('*', true), text(' for a bullet list')],
      [text('1.', true), text(' for a numbered list')],
      [text('>', true), text(' for a quote')],
      [text('```', true), text(' for a code block')],
    ),
    heading(2, 'Formatting shortcuts'),
    bulletList(
      [text('⌘B', true), text(' bold')],
      [text('⌘I', true), text(' italic')],
      [text('⌘U', true), text(' underline')],
      [text('⌘⇧X', true), text(' strikethrough')],
    ),
    heading(2, 'App shortcuts'),
    bulletList(
      [text('⌘N', true), text(' new note')],
      [text('⌘⇧N', true), text(' new folder')],
      [text('⌘F', true), text(' search all notes')],
      [text('⌘⌫', true), text(' delete the selected note (when the editor is not focused)')],
    ),
    paragraph(text('On Windows and Linux, use Ctrl instead of ⌘.')),
    heading(2, 'Organize and export'),
    paragraph(
      text(
        'Create folders and sub-folders in the left pane, then drag notes onto a folder to move them. Notes outside any folder show up under All Notes.',
      ),
    ),
    paragraph(
      text('Use '),
      bold('Export all'),
      text(' or a folder’s '),
      bold('Export folder'),
      text(' action to download your notes as a zip of Markdown files.'),
    ),
    paragraph(text('Feel free to edit or delete this note.')),
  ],
}

/**
 * Plain-text projection of {@link welcomeNoteContent}: headings, paragraphs and
 * list items joined by newlines. Used as the note's `text` so the title and
 * search index match what the editor would produce.
 */
export const welcomeNoteText: string = docToPlainText(welcomeNoteContent)
