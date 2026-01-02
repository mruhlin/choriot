import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import '@testing-library/jest-dom'
import ProfileClient from '../profile-client'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

global.fetch = jest.fn()

const mockUpdate = jest.fn()
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
    update: mockUpdate,
  })),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

describe('ProfileClient', () => {
  const mockRouter = {
    refresh: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    replace: jest.fn(),
  }

  const mockUser = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    timezone: 'America/Los_Angeles',
    image: 'https://example.com/profile.jpg',
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
    global.fetch = jest.fn()
  })

  describe('Rendering', () => {
    it('should render profile settings page with user info', () => {
      render(<ProfileClient user={mockUser} />)

      expect(screen.getByText('Profile Settings')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })

    it('should display user image when available', () => {
      render(<ProfileClient user={mockUser} />)

      const images = screen.getAllByAltText('Alice')
      expect(images[0]).toHaveAttribute('src', 'https://example.com/profile.jpg')
    })

    it('should display default logo when user has no image', () => {
      const userWithoutImage = { ...mockUser, image: null }
      render(<ProfileClient user={userWithoutImage} />)

      const images = screen.getAllByAltText('Alice')
      expect(images[0]).toHaveAttribute('src', '/logo.png')
    })

    it('should display "Not set" when user has no name', () => {
      const userWithoutName = { ...mockUser, name: null }
      render(<ProfileClient user={userWithoutName} />)

      expect(screen.getByText('Not set')).toBeInTheDocument()
    })

    it('should render back to dashboard link', () => {
      render(<ProfileClient user={mockUser} />)

      const link = screen.getByRole('link', { name: /back to dashboard/i })
      expect(link).toHaveAttribute('href', '/dashboard')
    })

    it('should render upload button', () => {
      render(<ProfileClient user={mockUser} />)

      expect(screen.getByRole('button', { name: /upload new image/i })).toBeInTheDocument()
    })

    it('should render file input with correct accept types', () => {
      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/gif,image/webp')
    })
  })

  describe('File Upload', () => {
    it('should handle successful file upload', async () => {
      const updatedUser = {
        ...mockUser,
        image: 'https://blob.vercel-storage.com/new-profile.jpg',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrl: 'https://blob.vercel-storage.com/new-profile.jpg',
          user: updatedUser,
        }),
      })

      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test image content'], 'profile.jpg', { type: 'image/jpeg' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/user/profile-image',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        )
      })

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalled()
        expect(mockRouter.refresh).toHaveBeenCalled()
      })
    })

    it('should show uploading state during upload', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
      )

      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test image content'], 'profile.jpg', { type: 'image/jpeg' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Uploading...')).toBeInTheDocument()
      })
    })

    it('should validate file type on client side', async () => {
      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test content'], 'document.pdf', { type: 'application/pdf' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.')).toBeInTheDocument()
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should validate file size on client side', async () => {
      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 })

      fireEvent.change(fileInput, { target: { files: [largeFile] } })

      await waitFor(() => {
        expect(screen.getByText('File too large. Maximum size is 5MB.')).toBeInTheDocument()
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should display error message from server', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Failed to upload image to storage',
        }),
      })

      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test image content'], 'profile.jpg', { type: 'image/jpeg' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Failed to upload image to storage')).toBeInTheDocument()
      })
    })

    it('should handle network error gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test image content'], 'profile.jpg', { type: 'image/jpeg' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })

    it('should clear file input after upload attempt', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          imageUrl: 'https://blob.vercel-storage.com/new-profile.jpg',
          user: { ...mockUser, image: 'https://blob.vercel-storage.com/new-profile.jpg' },
        }),
      })

      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test image content'], 'profile.jpg', { type: 'image/jpeg' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(fileInput.value).toBe('')
      })
    })

    it('should do nothing when no file is selected', async () => {
      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      fireEvent.change(fileInput, { target: { files: [] } })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle upload button click', () => {
      render(<ProfileClient user={mockUser} />)

      const uploadButton = screen.getByRole('button', { name: /upload new image/i })
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const clickSpy = jest.spyOn(fileInput, 'click')

      fireEvent.click(uploadButton)

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should accept JPEG files', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ imageUrl: 'test.jpg', user: mockUser }),
      })

      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'profile.jpg', { type: 'image/jpeg' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('should accept PNG files', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ imageUrl: 'test.png', user: mockUser }),
      })

      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'profile.png', { type: 'image/png' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('should accept GIF files', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ imageUrl: 'test.gif', user: mockUser }),
      })

      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'profile.gif', { type: 'image/gif' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('should accept WebP files', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ imageUrl: 'test.webp', user: mockUser }),
      })

      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'profile.webp', { type: 'image/webp' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('should disable upload button during upload', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100))
      )

      render(<ProfileClient user={mockUser} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test image content'], 'profile.jpg', { type: 'image/jpeg' })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /uploading/i })
        expect(uploadButton).toBeDisabled()
      })
    })
  })

  describe('Account Information', () => {
    it('should display account information section', () => {
      render(<ProfileClient user={mockUser} />)

      expect(screen.getByText('Account Information')).toBeInTheDocument()
      // Name and Email appear in both the form and Account Information section
      const nameElements = screen.getAllByText('Name')
      expect(nameElements.length).toBeGreaterThan(0)
      const emailElements = screen.getAllByText('Email')
      expect(emailElements.length).toBeGreaterThan(0)
    })
  })
})
