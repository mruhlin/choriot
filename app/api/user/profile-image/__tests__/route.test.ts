import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: jest.fn(),
  unauthorizedResponse: jest.fn(() => 
    NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ),
}))

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => {
      const response = {
        json: jest.fn().mockResolvedValue(data),
        status: init?.status || 200,
        headers: new Map(),
      }
      return response
    }),
  },
}))

describe('/api/user/profile-image', () => {
  const mockUser = {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(null)

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const req = {
        formData: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue(mockFile),
        }),
      } as any

      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should return 400 when no file is provided', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const req = {
        formData: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue(null),
        }),
      } as any

      const response = await POST(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('No file provided')
    })

    it('should return 400 for invalid file type', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const req = {
        formData: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue(file),
        }),
      } as any

      const response = await POST(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.')
    })

    it('should return 400 when file is too large', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const largeBuffer = new ArrayBuffer(6 * 1024 * 1024) // 6MB
      const file = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 })
      
      const req = {
        formData: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue(file),
        }),
      } as any

      const response = await POST(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('File too large. Maximum size is 5MB.')
    })

    it('should successfully upload JPEG image', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(put as jest.Mock).mockResolvedValue({
        url: 'https://blob.vercel-storage.com/profile-images/user-1-123456.jpg',
      })

      const updatedUser = {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        image: 'https://blob.vercel-storage.com/profile-images/user-1-123456.jpg',
      }
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const file = new File(['test image content'], 'profile.jpg', { type: 'image/jpeg' })
      const req = {
        formData: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue(file),
        }),
      } as any

      const response = await POST(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.imageUrl).toBe('https://blob.vercel-storage.com/profile-images/user-1-123456.jpg')
      expect(data.user).toEqual(updatedUser)
      expect(put).toHaveBeenCalled()
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { image: 'https://blob.vercel-storage.com/profile-images/user-1-123456.jpg' },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })
    })

    it('should successfully upload PNG image', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(put as jest.Mock).mockResolvedValue({
        url: 'https://blob.vercel-storage.com/profile-images/user-1-123456.png',
      })

      const updatedUser = {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        image: 'https://blob.vercel-storage.com/profile-images/user-1-123456.png',
      }
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const file = new File(['test image content'], 'profile.png', { type: 'image/png' })
      const req = {
        formData: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue(file),
        }),
      } as any

      const response = await POST(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.imageUrl).toBe('https://blob.vercel-storage.com/profile-images/user-1-123456.png')
    })

    it('should successfully upload GIF image', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(put as jest.Mock).mockResolvedValue({
        url: 'https://blob.vercel-storage.com/profile-images/user-1-123456.gif',
      })

      const updatedUser = {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        image: 'https://blob.vercel-storage.com/profile-images/user-1-123456.gif',
      }
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const file = new File(['test image content'], 'profile.gif', { type: 'image/gif' })
      const req = {
        formData: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue(file),
        }),
      } as any

      const response = await POST(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.imageUrl).toBe('https://blob.vercel-storage.com/profile-images/user-1-123456.gif')
    })

    it('should successfully upload WebP image', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(put as jest.Mock).mockResolvedValue({
        url: 'https://blob.vercel-storage.com/profile-images/user-1-123456.webp',
      })

      const updatedUser = {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        image: 'https://blob.vercel-storage.com/profile-images/user-1-123456.webp',
      }
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const file = new File(['test image content'], 'profile.webp', { type: 'image/webp' })
      const req = {
        formData: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue(file),
        }),
      } as any

      const response = await POST(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.imageUrl).toBe('https://blob.vercel-storage.com/profile-images/user-1-123456.webp')
    })

    it('should return 500 when blob storage fails', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(put as jest.Mock).mockRejectedValue(new Error('Storage error'))

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const file = new File(['test image content'], 'profile.jpg', { type: 'image/jpeg' })
      const req = {
        formData: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue(file),
        }),
      } as any

      const response = await POST(req)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to upload image to storage')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Blob storage error:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })

    it('should return 500 when database update fails', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(put as jest.Mock).mockResolvedValue({
        url: 'https://blob.vercel-storage.com/profile-images/user-1-123456.jpg',
      })
      ;(prisma.user.update as jest.Mock).mockRejectedValue(new Error('Database error'))

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const file = new File(['test image content'], 'profile.jpg', { type: 'image/jpeg' })
      const req = {
        formData: jest.fn().mockResolvedValue({
          get: jest.fn().mockReturnValue(file),
        }),
      } as any

      const response = await POST(req)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Profile image upload error:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })
  })
})
