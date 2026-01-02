import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import '@testing-library/jest-dom'
import ProfileClient from '../profile-client'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

describe('ProfileClient', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  }

  const mockUser = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    image: 'https://example.com/profile.jpg',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
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
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
  })
})
