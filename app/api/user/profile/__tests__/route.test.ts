import { GET, PATCH } from '../route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
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

describe('/api/user/profile', () => {
  const mockUser = {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(null)

      const response = await GET()

      expect(response.status).toBe(401)
    })

    it('should return user profile', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockProfile = {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        timezone: 'America/Los_Angeles',
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockProfile)

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockProfile)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          name: true,
          email: true,
          timezone: true,
        }
      })
    })

    it('should return 404 if user not found', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await GET()

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('User not found')
    })

    it('should handle database errors', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'))

      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('PATCH', () => {
    it('should return 401 when user is not authenticated', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(null)

      const req = new Request('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      })
      const response = await PATCH(req)

      expect(response.status).toBe(401)
    })

    it('should update user name', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const updatedUser = {
        id: 'user-1',
        name: 'Alice Smith',
        email: 'alice@example.com',
        timezone: 'America/Los_Angeles',
      }

      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const req = new Request('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Alice Smith' }),
      })

      const response = await PATCH(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(updatedUser)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Alice Smith' },
        select: {
          id: true,
          name: true,
          email: true,
          timezone: true,
        }
      })
    })

    it('should allow setting name to null', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const updatedUser = {
        id: 'user-1',
        name: null,
        email: 'alice@example.com',
        timezone: 'America/Los_Angeles',
      }

      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const req = new Request('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: null }),
      })

      const response = await PATCH(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.name).toBeNull()
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: null },
        })
      )
    })

    it('should reject email changes', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const req = new Request('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ 
          name: 'Alice Smith',
          email: 'newemail@example.com' 
        }),
      })

      const response = await PATCH(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Email cannot be changed')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should reject when only email is provided', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const req = new Request('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ 
          email: 'newemail@example.com' 
        }),
      })

      const response = await PATCH(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Email cannot be changed')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should return 400 for invalid data', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const req = new Request('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ 
          name: 123 // Invalid type
        }),
      })

      const response = await PATCH(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid data')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.user.update as jest.Mock).mockRejectedValue(new Error('DB error'))

      const req = new Request('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      })

      const response = await PATCH(req)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('should allow updating with empty string name', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const updatedUser = {
        id: 'user-1',
        name: '',
        email: 'alice@example.com',
        timezone: 'America/Los_Angeles',
      }

      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const req = new Request('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: '' }),
      })

      const response = await PATCH(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.name).toBe('')
    })
  })
})
