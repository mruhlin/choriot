import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    group: {
      findMany: jest.fn(),
      create: jest.fn(),
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

describe('/api/groups', () => {
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

    it('should return user groups', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const mockGroups = [
        {
          id: 'group-1',
          name: 'Family',
          description: null,
          createdAt: new Date('2024-01-01'),
          memberships: [
            {
              userId: 'user-1',
              groupId: 'group-1',
              role: 'ADMIN',
              user: mockUser,
            },
          ],
          _count: {
            chores: 5,
          },
        },
      ]

      ;(prisma.group.findMany as jest.Mock).mockResolvedValue(mockGroups)

      const response = await GET()

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockGroups)
      expect(prisma.group.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            memberships: {
              some: {
                userId: 'user-1',
              },
            },
          },
        })
      )
    })

    it('should include group memberships and chore count', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.group.findMany as jest.Mock).mockResolvedValue([])

      await GET()

      expect(prisma.group.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            memberships: expect.any(Object),
            _count: expect.objectContaining({
              select: {
                chores: true,
              },
            }),
          }),
        })
      )
    })
  })

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(null)

      const req = new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Group' }),
      })
      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should create a new group with user as admin', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const newGroup = {
        id: 'group-2',
        name: 'Work Team',
        description: 'Office chores',
        createdAt: new Date('2024-01-05'),
        memberships: [
          {
            userId: 'user-1',
            groupId: 'group-2',
            role: 'ADMIN',
            user: mockUser,
          },
        ],
      }

      ;(prisma.group.create as jest.Mock).mockResolvedValue(newGroup)

      const req = new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Work Team',
          description: 'Office chores',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toEqual(newGroup)
      expect(prisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Work Team',
            description: 'Office chores',
            memberships: {
              create: {
                userId: 'user-1',
                role: 'ADMIN',
              },
            },
          }),
        })
      )
    })

    it('should create a group without description', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const newGroup = {
        id: 'group-3',
        name: 'Simple Group',
        description: undefined,
        createdAt: new Date('2024-01-05'),
        memberships: [
          {
            userId: 'user-1',
            groupId: 'group-3',
            role: 'ADMIN',
            user: mockUser,
          },
        ],
      }

      ;(prisma.group.create as jest.Mock).mockResolvedValue(newGroup)

      const req = new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Simple Group',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(201)
    })

    it('should return 400 for invalid data', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const req = new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required 'name' field
          description: 'A group without a name',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid data')
    })

    it('should return 400 for empty group name', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const req = new Request('http://localhost:3000/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid data')
    })
  })
})
