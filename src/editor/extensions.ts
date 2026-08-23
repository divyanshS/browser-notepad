import { Extension, type Extensions } from '@tiptap/core'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'

/** Placeholder shown in an empty note. */
export const EDITOR_PLACEHOLDER = 'Start writing…'

/**
 * Adds `Mod-Shift-x` as an extra strikethrough shortcut
 * (StarterKit's Strike already binds `Mod-Shift-s`).
 */
const StrikeShortcut = Extension.create({
  name: 'strikeShortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
    }
  },
})

/**
 * Builds the extension list for the note editor.
 * StarterKit provides headings, lists, blockquote, code block, bold/italic/underline/strike,
 * link, history and the Markdown input rules (`#`, `-`, `*`, `1.`, `>`, ```` ``` ````).
 * No image extension is registered, so `<img>` can never enter the document schema.
 */
export function createExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true },
    }),
    Placeholder.configure({ placeholder: EDITOR_PLACEHOLDER }),
    StrikeShortcut,
  ]
}
