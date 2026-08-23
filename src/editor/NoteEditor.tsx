import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { useMemo, type ReactElement } from 'react'
import { EditorToolbar } from './EditorToolbar'
import { createExtensions } from './extensions'
import { createMediaRejectionProps } from './pasteRules'
import { useAutosave, type SaveHandler } from './useAutosave'

export interface NoteEditorProps {
  noteId: string
  /** Loaded once per mount — the parent must pass `key={noteId}` so the editor remounts per note. */
  initialContent: JSONContent
  /** Called after a 500 ms debounce and whenever pending changes are flushed. */
  onSave: SaveHandler
  autofocus?: boolean
}

/** Static editor props: stable identity so `useEditor` does not re-apply options on each render. */
const EDITOR_PROPS = {
  attributes: { class: 'note-editor', spellcheck: 'true' },
  ...createMediaRejectionProps(),
}

/**
 * Rich-text note editor with a formatting toolbar and debounced autosave.
 * Images and other media are rejected on paste and drop.
 */
export function NoteEditor({ noteId, initialContent, onSave, autofocus = false }: NoteEditorProps): ReactElement {
  const extensions = useMemo(() => createExtensions(), [])
  const editor = useEditor({
    extensions,
    content: initialContent,
    autofocus: autofocus ? 'end' : false,
    editorProps: EDITOR_PROPS,
  })

  useAutosave(editor, noteId, onSave)

  return (
    <>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="note-editor-scroll" />
    </>
  )
}
