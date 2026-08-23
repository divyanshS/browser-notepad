# AGENTS.md — guide for AI coding agents

This file is the single source of project knowledge for AI tools (Claude Code reads it via `CLAUDE.md`; Codex, Cursor, Copilot and others read `AGENTS.md` directly). Keep it accurate when you change the architecture.

## What this is

A local-first, browser-only notes app. **No backend, no network calls.** All data lives in the browser's IndexedDB; the only way data leaves the browser is the user's explicit Markdown zip export. Deployed as a static site to GitHub Pages. Originally vibe-coded for personal use and open-sourced under MIT.

## Stack (pinned exact versions in package.json — do not add dependencies casually)

React 19 · Vite 8 (rolldown) · TypeScript 6 strict · Tiptap 3 (`@tiptap/react`, `starter-kit`, `extensions`) · Dexie 4 + `dexie-react-hooks` · MiniSearch 7 · JSZip 3 (lazy-loaded) · Vitest 4 + jsdom + fake-indexeddb + Testing Library · oxlint.

## Commands

```bash
npm ci              # install (Node >= 20.19, see .nvmrc)
npm run dev         # http://localhost:5173
npm run typecheck   # tsc -b  (must be clean)
npm run lint        # oxlint  (must be clean)
npm test            # vitest run (all green)
npm run build       # tsc -b && vite build → dist/
```
CI (`.github/workflows/deploy.yml`) runs typecheck → lint → test → build on every push to `main`, then deploys `dist/` to Pages with `VITE_BASE=/<repo>/`.

## TypeScript constraints (will fail the build if ignored)

`verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no `enum`, no parameter properties, no namespaces), `noUnusedLocals` / `noUnusedParameters`. Never add `@ts-ignore` or loosen tsconfig.

## Architecture

```
src/
  types.ts            Folder, Note, ALL_NOTES_ID, FolderSelection
  lib/                noteText (title/snippet derivation, ids), formatDate
  db/                 db.ts: Dexie schema + all CRUD + folder-tree helpers; welcomeNote.ts
  search/             NotesSearchIndex (MiniSearch), highlightText, useNotesSearch
  markdown/           serializeToMarkdown(tiptapJSON), docToPlainText
  export/             planExport (pure) → buildExportZip (JSZip, dynamic import) → downloadBlob
  editor/             NoteEditor (Tiptap), EditorToolbar, extensions, pasteRules (media rejection), useAutosave
  components/         FolderPane/FolderTreeItem, NoteList/NoteListItem, SearchBar, EditorPane,
                      MoveNoteMenu, ActionMenu, ConfirmDialog (<dialog>), ThemePicker, EmptyState, Icons
  hooks/              useFolders/useNotes (useLiveQuery), useSelection, useAppShortcuts, useTheme,
                      useSidebarCollapsed, useExpandedFolders, usePersistedValue, drag-drop & keyboard nav
  styles/             index.css (tokens, light/dark, reset) · app.css (layout, components) · editor.css (ProseMirror)
  App.tsx             composition root: owns selection, query, dialogs, wires everything
```

### Data model & invariants
- `Note.content` is Tiptap JSON (source of truth); `Note.text` is its plain-text projection (search, snippets); `Note.title` = first non-empty line of `text` (`deriveTitle`), fallback `"New Note"`. There is no separate title field.
- `Note.folderId === null` means **unfiled**: shown only under "All Notes". New notes created while "All Notes" is selected are unfiled.
- Folders nest via `parentId`. `deleteFolder` removes the whole subtree and **unfiles** (never deletes) the notes inside, in one Dexie transaction.
- A folder's list shows only its direct notes, sorted by `updatedAt` desc. Search ignores folder selection.
- `saveNoteContent` uses `Table.update` so it is a no-op for a deleted note (autosave must never resurrect one).
- `seedWelcomeNoteIfEmpty` runs in a transaction and is idempotent under React StrictMode double-invocation; it sets `meta.seeded`.

### Editor rules
- `NoteEditor` is mounted with `key={note.id}` — switching notes remounts the editor; `useAutosave` flushes pending edits on unmount, blur, `visibilitychange`, `pagehide`, `beforeunload` (500 ms debounce otherwise).
- Images/media are rejected: no Image extension in the schema **and** explicit `transformPastedHTML` / `handlePaste` / `handleDrop` in `pasteRules.ts`. Keep both layers.
- Undo/redo come from StarterKit's history (⌘Z / ⌘⇧Z) and the toolbar buttons.
- `⌘⌫` deletes the selected note only when focus is outside the editor / any text field (`useAppShortcuts.isTextEntryTarget`). Do not break this.

### UI conventions
- Plain CSS with custom properties. Light tokens on `:root`; dark tokens under both `@media (prefers-color-scheme: dark) :root:not([data-theme='light'])` and `:root[data-theme='dark']`. **Never hard-code a colour in a component** — add a token.
- `useTheme` stores `notepad.theme` (`system | light | dark`) and sets `data-theme` on `<html>`. Other persisted UI prefs use `usePersistedValue` with a `notepad.*` key and a validating parser.
- Icon buttons need `aria-label` + `title`; lists use `role="listbox"/"option"`, folder tree `role="tree"/"treeitem"`, menus `role="menu"`. Confirmations use native `<dialog>`.
- Toolbar buttons use `onMouseDown={preventDefault}` so the editor keeps focus.

## Testing expectations
- Every module has unit tests next to it (`*.test.ts(x)`). Storage tests run against fake-indexeddb; clear tables in `beforeEach`.
- Add/adjust tests with every behaviour change. Do not delete or skip tests to get green.
- Tiptap in jsdom may need `Range.prototype.getClientRects` / `getBoundingClientRect` stubs — see existing test files for the pattern.

## Security & privacy posture
- Zero network I/O by design. Do not add analytics, fonts from CDNs, or any fetch.
- All user content is rendered through React/ProseMirror (no `dangerouslySetInnerHTML`). Pasted HTML goes through ProseMirror's schema; keep it that way.
- Export file names are sanitised (`sanitizeFileName`) and de-duplicated; zip paths are always POSIX-relative.

## Things agents should NOT do
- Don't add a backend, sync, or auth. Don't introduce Tailwind/CSS-in-JS. Don't add a separate title field.
- Don't change the IndexedDB schema version without a Dexie `upgrade()` migration — users have real data.
- Don't run `git` commands unless the user asks; the owner manages commits.
