import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { db } from './db/db'

// ProseMirror measures layout while mounting; jsdom has no layout engine.
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }
Range.prototype.getClientRects = () => [] as unknown as DOMRectList
Range.prototype.getBoundingClientRect = () => emptyRect as DOMRect
Element.prototype.getClientRects = () => [] as unknown as DOMRectList

const WELCOME_TITLE = 'Welcome to Notes'

function noteList(): HTMLElement {
  return screen.getByRole('listbox')
}

async function findWelcomeOption(): Promise<HTMLElement> {
  return screen.findByRole('option', { name: new RegExp(WELCOME_TITLE) })
}

describe('App', () => {
  beforeEach(async () => {
    await Promise.all([db.notes.clear(), db.folders.clear(), db.meta.clear()])
    localStorage.clear()
  })

  it('renders three panes and seeds the welcome note on first launch', async () => {
    render(<App />)

    expect(screen.getByRole('complementary', { name: 'Folders' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editor' })).toBeInTheDocument()
    expect(screen.getByRole('tree', { name: 'Folders' })).toBeInTheDocument()

    const welcome = await findWelcomeOption()
    await waitFor(() => expect(welcome).toHaveAttribute('aria-selected', 'true'))
    expect(screen.getByRole('toolbar', { name: 'Formatting' })).toBeInTheDocument()
    expect(await db.notes.count()).toBe(1)
  })

  it('creates a note from the header button, selects it and lists it first', async () => {
    const user = userEvent.setup()
    render(<App />)
    await findWelcomeOption()

    await user.click(screen.getByRole('button', { name: 'New note' }))

    const created = await screen.findByRole('option', { name: /New Note/ })
    expect(created).toHaveAttribute('aria-selected', 'true')
    const options = within(noteList()).getAllByRole('option')
    expect(options[0]).toBe(created)
    expect(options).toHaveLength(2)
  })

  it('creates a folder in rename mode and commits the name on Enter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await findWelcomeOption()

    await user.click(screen.getByRole('button', { name: 'New Folder' }))
    const input = await screen.findByRole('textbox', { name: 'Folder name' })
    await user.clear(input)
    await user.type(input, 'Projects{Enter}')

    const folder = await screen.findByRole('treeitem', { name: /Projects/ })
    expect(folder).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.getByText('No notes')).toBeInTheDocument()
    expect(screen.getByText('No note selected')).toBeInTheDocument()
  })

  it('shows highlighted search results with a folder breadcrumb', async () => {
    const user = userEvent.setup()
    render(<App />)
    await findWelcomeOption()

    await user.type(screen.getByRole('searchbox', { name: 'Search notes' }), 'welcome')

    expect(screen.getByRole('heading', { name: 'Search results' })).toBeInTheDocument()
    const option = await findWelcomeOption()
    const marks = option.querySelectorAll('mark.search-highlight')
    expect(marks.length).toBeGreaterThan(0)
    expect(marks[0]).toHaveTextContent(/welcome/i)
    expect(within(option).getByText('All Notes')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.getByRole('searchbox', { name: 'Search notes' })).toHaveValue('')
    expect(screen.getByRole('heading', { name: 'All Notes' })).toBeInTheDocument()
  })

  it('deletes the selected note after confirming the dialog', async () => {
    const user = userEvent.setup()
    render(<App />)
    const welcome = await findWelcomeOption()
    await waitFor(() => expect(welcome).toHaveAttribute('aria-selected', 'true'))

    await user.click(screen.getByRole('button', { name: 'Delete note' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete Note' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('option', { name: new RegExp(WELCOME_TITLE) })).toBeNull())
    expect(screen.getByText('No notes')).toBeInTheDocument()
    expect(screen.getByText('No note selected')).toBeInTheDocument()
    expect(await db.notes.count()).toBe(0)
  })

  it('moves a note into a folder from the item menu', async () => {
    const user = userEvent.setup()
    render(<App />)
    await findWelcomeOption()

    await user.click(screen.getByRole('button', { name: 'New Folder' }))
    await user.type(await screen.findByRole('textbox', { name: 'Folder name' }), '{Enter}')
    await user.click(screen.getByRole('treeitem', { name: /All Notes/ }))

    const option = await findWelcomeOption()
    await user.click(within(option).getByRole('button', { name: `Actions for ${WELCOME_TITLE}` }))
    await user.click(screen.getByRole('menuitem', { name: 'Move to…' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'New Folder' }))

    await waitFor(async () => {
      const [note] = await db.notes.toArray()
      const [folder] = await db.folders.toArray()
      expect(note.folderId).toBe(folder.id)
    })
  })

  it('deletes a folder via its menu and unfiles its notes', async () => {
    const user = userEvent.setup()
    render(<App />)
    await findWelcomeOption()

    await user.click(screen.getByRole('button', { name: 'New Folder' }))
    const input = await screen.findByRole('textbox', { name: 'Folder name' })
    await user.clear(input)
    await user.type(input, 'Temp{Enter}')
    const [note] = await db.notes.toArray()
    const [folder] = await db.folders.toArray()
    await db.notes.update(note.id, { folderId: folder.id })
    await findWelcomeOption()

    await user.click(screen.getByRole('button', { name: 'Actions for Temp' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('treeitem', { name: /Temp/ })).toBeNull())
    expect(screen.getByRole('treeitem', { name: /All Notes/ })).toHaveAttribute('aria-selected', 'true')
    expect(await db.folders.count()).toBe(0)
    expect((await db.notes.get(note.id))?.folderId).toBeNull()
  })
})
