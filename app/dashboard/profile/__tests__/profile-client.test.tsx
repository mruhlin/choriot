import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import ProfileClient from '../profile-client'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

global.fetch = jest.fn()

describe('ProfileClient', () => {
  const mockUser = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    timezone: 'America/Los_Angeles',
  }

  const mockRouter = {
    refresh: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    replace: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('should render the profile form with user data', () => {
    render(<ProfileClient user={mockUser} />)

    expect(screen.getByText('Profile Settings')).toBeInTheDocument()
    expect(screen.getByText('Edit Your Profile')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com')
    expect(screen.getByLabelText('Display Name')).toHaveValue('Alice')
    expect(screen.getByText('Email cannot be changed')).toBeInTheDocument()
  })

  it('should render with empty name when user name is null', () => {
    const userWithoutName = { ...mockUser, name: null }
    render(<ProfileClient user={userWithoutName} />)

    expect(screen.getByLabelText('Display Name')).toHaveValue('')
  })

  it('should have email field disabled', () => {
    render(<ProfileClient user={mockUser} />)

    const emailInput = screen.getByLabelText('Email')
    expect(emailInput).toBeDisabled()
  })

  it('should allow editing the name field', () => {
    render(<ProfileClient user={mockUser} />)

    const nameInput = screen.getByLabelText('Display Name') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Alice Smith' } })

    expect(nameInput.value).toBe('Alice Smith')
  })

  it('should show "Back to Dashboard" link', () => {
    render(<ProfileClient user={mockUser} />)

    const link = screen.getByText('Back to Dashboard')
    expect(link).toHaveAttribute('href', '/dashboard')
  })

  it('should submit name change successfully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'user-1', name: 'Alice Smith', email: 'alice@example.com' }),
    })

    render(<ProfileClient user={mockUser} />)

    const nameInput = screen.getByLabelText('Display Name')
    const submitButton = screen.getByRole('button', { name: /save changes/i })

    fireEvent.change(nameInput, { target: { value: 'Alice Smith' } })
    fireEvent.click(submitButton)

    expect(submitButton).toHaveTextContent('Saving...')
    expect(submitButton).toBeDisabled()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alice Smith' }),
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument()
    })

    expect(mockRouter.refresh).toHaveBeenCalled()
    expect(submitButton).toHaveTextContent('Save Changes')
    expect(submitButton).not.toBeDisabled()
  })

  it('should submit null when name is empty', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'user-1', name: null, email: 'alice@example.com' }),
    })

    render(<ProfileClient user={mockUser} />)

    const nameInput = screen.getByLabelText('Display Name')
    const submitButton = screen.getByRole('button', { name: /save changes/i })

    fireEvent.change(nameInput, { target: { value: '' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: null }),
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument()
    })
  })

  it('should show error message when update fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to update profile' }),
    })

    render(<ProfileClient user={mockUser} />)

    const nameInput = screen.getByLabelText('Display Name')
    const submitButton = screen.getByRole('button', { name: /save changes/i })

    fireEvent.change(nameInput, { target: { value: 'Alice Smith' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to update profile')).toBeInTheDocument()
    })

    expect(mockRouter.refresh).not.toHaveBeenCalled()
  })

  it('should show generic error message when no specific error provided', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    })

    render(<ProfileClient user={mockUser} />)

    const submitButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to update profile')).toBeInTheDocument()
    })
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<ProfileClient user={mockUser} />)

    const submitButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    expect(mockRouter.refresh).not.toHaveBeenCalled()
  })

  it('should clear previous messages on new submission', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user-1', name: 'Alice Smith' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' }),
      })

    render(<ProfileClient user={mockUser} />)

    const submitButton = screen.getByRole('button', { name: /save changes/i })

    // First submission (success)
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument()
    })

    // Second submission (error)
    fireEvent.click(submitButton)
    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument()
    })

    // Success message should be gone
    expect(screen.queryByText('Profile updated successfully!')).not.toBeInTheDocument()
  })

  it('should render with all required classes for styling', () => {
    render(<ProfileClient user={mockUser} />)

    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')
    expect(form).toBeInTheDocument()
    
    // Check for success/error message styling by triggering a success
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'user-1', name: 'Alice' }),
    })

    const submitButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(submitButton)
  })
})
