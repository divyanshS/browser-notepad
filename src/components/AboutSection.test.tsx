import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AboutSection } from './AboutSection'
import { GITHUB_URL, LINKEDIN_URL, REPO_URL } from '../lib/appInfo'

describe('AboutSection', () => {
  it('links to the author and the repository from the footer line', () => {
    render(<AboutSection />)
    expect(screen.getByRole('link', { name: /Divyansh/ })).toHaveAttribute('href', LINKEDIN_URL)
    expect(screen.getByRole('link', { name: 'Source' })).toHaveAttribute('href', REPO_URL)
  })

  it('opens a dialog with every project link and the disclaimer, then closes it', async () => {
    const user = userEvent.setup()
    render(<AboutSection />)
    await user.click(screen.getByRole('button', { name: 'About' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Source code on GitHub' })).toHaveAttribute('href', REPO_URL)
    expect(screen.getByRole('link', { name: 'GitHub profile' })).toHaveAttribute('href', GITHUB_URL)
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', LINKEDIN_URL)
    expect(dialog).toHaveTextContent(/without warranty of any kind/)
    expect(dialog).toHaveTextContent(/no liability for data loss/)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens external links safely in a new tab', async () => {
    const user = userEvent.setup()
    render(<AboutSection />)
    await user.click(screen.getByRole('button', { name: 'About' }))
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })
})
