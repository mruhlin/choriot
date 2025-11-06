import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    groupMembership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    chore: {
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

describe('/api/chores', () => {
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

      const req = new Request('http://localhost:3000/api/chores')
      const response = await GET(req)

      expect(response.status).toBe(401)
    })

    it('should return user chores', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.groupMembership.findMany as jest.Mock).mockResolvedValue([
        { groupId: 'group-1' },
      ])

      const mockChores = [
        {
          id: 'chore-1',
          title: 'Clean kitchen',
          description: null,
          recurrenceType: 'WEEKLY',
          startDate: new Date('2024-01-01'),
          dueTime: '09:00',
          points: 10,
          groupId: 'group-1',
          createdById: 'user-1',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          createdBy: mockUser,
          group: { id: 'group-1', name: 'Family' },
          assignments: [],
          completions: [],
        },
      ]

      ;(prisma.chore.findMany as jest.Mock).mockResolvedValue(mockChores)

      const req = new Request('http://localhost:3000/api/chores')
      const response = await GET(req)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockChores)
      expect(prisma.chore.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      )
    })

    it('should filter chores by groupId when provided', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.groupMembership.findMany as jest.Mock).mockResolvedValue([
        { groupId: 'group-1' },
      ])
      ;(prisma.chore.findMany as jest.Mock).mockResolvedValue([])

      const req = new Request('http://localhost:3000/api/chores?groupId=group-1')
      await GET(req)

      expect(prisma.chore.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            groupId: 'group-1',
          }),
        })
      )
    })
  })

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(null)

      const req = new Request('http://localhost:3000/api/chores', {
        method: 'POST',
        body: JSON.stringify({ title: 'New chore' }),
      })
      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should create a private chore', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const newChore = {
        id: 'chore-2',
        title: 'Wash car',
        description: null,
        recurrenceType: 'NONE',
        startDate: new Date('2024-01-05'),
        dueTime: null,
        points: 15,
        groupId: null,
        createdById: 'user-1',
        createdAt: new Date('2024-01-05'),
        createdBy: mockUser,
        group: null,
      }

      ;(prisma.chore.create as jest.Mock).mockResolvedValue(newChore)

      const req = new Request('http://localhost:3000/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Wash car',
          points: 15,
          recurrenceType: 'NONE',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toEqual(newChore)
      expect(prisma.chore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Wash car',
            createdById: 'user-1',
            points: 15,
          }),
        })
      )
    })

    it('should create a group chore when user is a member', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        groupId: 'group-1',
        role: 'ADMIN',
      })

      const newChore = {
        id: 'chore-3',
        title: 'Group chore',
        description: null,
        recurrenceType: 'DAILY',
        startDate: new Date('2024-01-05'),
        dueTime: '10:00',
        points: 5,
        groupId: 'group-1',
        createdById: 'user-1',
        createdAt: new Date('2024-01-05'),
        createdBy: mockUser,
        group: { id: 'group-1', name: 'Family' },
      }

      ;(prisma.chore.create as jest.Mock).mockResolvedValue(newChore)

      const req = new Request('http://localhost:3000/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Group chore',
          groupId: 'group-1',
          recurrenceType: 'DAILY',
          dueTime: '10:00',
          points: 5,
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(201)
      expect(prisma.groupMembership.findUnique).toHaveBeenCalledWith({
        where: {
          userId_groupId: {
            userId: 'user-1',
            groupId: 'group-1',
          },
        },
      })
    })

    it('should return 403 when user is not a member of the group', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue(null)

      const req = new Request('http://localhost:3000/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Group chore',
          groupId: 'group-2',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('You are not a member of this group')
    })

    it('should return 400 for invalid data', async () => {
      ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      const req = new Request('http://localhost:3000/api/chores', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required 'title' field
          points: 5,
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid data')
    })
  })
})
