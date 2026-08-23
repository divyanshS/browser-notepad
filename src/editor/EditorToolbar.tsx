import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import type { MouseEvent, ReactElement } from 'react'
import { IS_MAC } from '../hooks/useAppShortcuts'

export interface EditorToolbarProps {
  editor: Editor | null
}

type CommandId =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'heading1'
  | 'heading2'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'undo'
  | 'redo'

interface ToolbarCommand {
  id: CommandId
  label: string
  /** Human-readable shortcut using `Mod` for ⌘ / Ctrl. */
  shortcut: string
  glyph: string
  isActive: (editor: Editor) => boolean
  /** When provided, the button is disabled while this returns false. */
  canRun?: (editor: Editor) => boolean
  /** Plain actions (undo/redo) have no pressed state. */
  toggle?: false
  run: (editor: Editor) => void
}

const TOOLBAR_GROUPS: ToolbarCommand[][] = [
  [
    {
      id: 'undo',
      label: 'Undo',
      shortcut: 'Mod+Z',
      glyph: '↶',
      toggle: false,
      isActive: () => false,
      canRun: (e) => e.can().undo(),
      run: (e) => e.chain().focus().undo().run(),
    },
    {
      id: 'redo',
      label: 'Redo',
      shortcut: 'Mod+Shift+Z',
      glyph: '↷',
      toggle: false,
      isActive: () => false,
      canRun: (e) => e.can().redo(),
      run: (e) => e.chain().focus().redo().run(),
    },
  ],
  [
    {
      id: 'bold',
      label: 'Bold',
      shortcut: 'Mod+B',
      glyph: 'B',
      isActive: (e) => e.isActive('bold'),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      id: 'italic',
      label: 'Italic',
      shortcut: 'Mod+I',
      glyph: 'I',
      isActive: (e) => e.isActive('italic'),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      id: 'underline',
      label: 'Underline',
      shortcut: 'Mod+U',
      glyph: 'U',
      isActive: (e) => e.isActive('underline'),
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      id: 'strike',
      label: 'Strikethrough',
      shortcut: 'Mod+Shift+X',
      glyph: 'S',
      isActive: (e) => e.isActive('strike'),
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
  ],
  [
    {
      id: 'heading1',
      label: 'Heading 1',
      shortcut: 'Mod+Alt+1',
      glyph: 'H1',
      isActive: (e) => e.isActive('heading', { level: 1 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'heading2',
      label: 'Heading 2',
      shortcut: 'Mod+Alt+2',
      glyph: 'H2',
      isActive: (e) => e.isActive('heading', { level: 2 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
  ],
  [
    {
      id: 'bulletList',
      label: 'Bullet list',
      shortcut: 'Mod+Shift+8',
      glyph: '•≡',
      isActive: (e) => e.isActive('bulletList'),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'orderedList',
      label: 'Numbered list',
      shortcut: 'Mod+Shift+7',
      glyph: '1≡',
      isActive: (e) => e.isActive('orderedList'),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
  ],
  [
    {
      id: 'blockquote',
      label: 'Quote',
      shortcut: 'Mod+Shift+B',
      glyph: '❝',
      isActive: (e) => e.isActive('blockquote'),
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'codeBlock',
      label: 'Code block',
      shortcut: 'Mod+Alt+C',
      glyph: '</>',
      isActive: (e) => e.isActive('codeBlock'),
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
  ],
]

interface ToolbarState {
  active: Record<CommandId, boolean>
  enabled: Record<CommandId, boolean>
}

const ALL_COMMANDS = TOOLBAR_GROUPS.flat()

function readToolbarState(editor: Editor | null): ToolbarState | null {
  if (!editor) return null
  const active = {} as ToolbarState['active']
  const enabled = {} as ToolbarState['enabled']
  for (const command of ALL_COMMANDS) {
    active[command.id] = command.isActive(editor)
    enabled[command.id] = command.canRun ? command.canRun(editor) : true
  }
  return { active, enabled }
}

/** Renders `Mod+Shift+X` as `⌘⇧X` on macOS and `Ctrl+Shift+X` elsewhere. */
function formatShortcut(shortcut: string): string {
  if (!IS_MAC) return shortcut.replace('Mod', 'Ctrl')
  return shortcut.replace('Mod+', '⌘').replace('Shift+', '⇧').replace('Alt+', '⌥')
}

/** Keeps focus inside the editor when a toolbar button is pressed. */
function preventFocusSteal(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault()
}

/**
 * Slim formatting toolbar. Active states are read through `useEditorState`
 * so the buttons update on every selection change without re-rendering the editor.
 */
export function EditorToolbar({ editor }: EditorToolbarProps): ReactElement {
  const state = useEditorState({ editor, selector: ({ editor: e }) => readToolbarState(e) })

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
      {TOOLBAR_GROUPS.map((group, index) => (
        <div className="editor-toolbar-group" key={index}>
          {group.map((command) => {
            const isActive = state?.active[command.id] ?? false
            const isEnabled = state?.enabled[command.id] ?? false
            return (
              <button
                key={command.id}
                type="button"
                className={`editor-toolbar-button${isActive ? ' is-active' : ''}`}
                aria-label={command.label}
                aria-pressed={command.toggle === false ? undefined : isActive}
                title={`${command.label} (${formatShortcut(command.shortcut)})`}
                disabled={!editor || !isEnabled}
                onMouseDown={preventFocusSteal}
                onClick={() => editor && command.run(editor)}
              >
                {command.glyph}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
