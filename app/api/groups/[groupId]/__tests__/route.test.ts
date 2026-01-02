import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    groupMembership: {
      findUnique: jest.fn(),
    },
    group: {
      findUnique: jest.fn(),
    },
    groupInvitation: {
      findMany: jest.fn(),
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

describe('/api/groups/[groupId] GET', () => {
  const mockUser = {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
  }

  const mockGroup = {
    id: 'group-1',
    name: 'Family',
    description: 'Family chores',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    memberships: [
      {
        id: 'membership-1',
        userId: 'user-1',
        groupId: 'group-1',
        role: 'ADMIN',
        joinedAt: new Date('2024-01-01'),
        user: {
          id: 'user-1',
          name: 'Alice',
          email: 'alice@example.com',
        },
      },
      {
        id: 'membership-2',
        userId: 'user-2',
        groupId: 'group-1',
        role: 'MEMBER',
        joinedAt: new Date('2024-01-02'),
        user: {
          id: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
        },
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/groups/group-1')
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await GET(req, { params })

    expect(response.status).toBe(401)
  })

  it('should return 404 when user is not a member of the group', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/groups/group-1')
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await GET(req, { params })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Group not found or you are not a member')
    expect(prisma.groupMembership.findUnique).toHaveBeenCalledWith({
      where: {
        userId_groupId: {
          userId: 'user-1',
          groupId: 'group-1',
        }
      }
    })
  })

  it('should return 404 when group does not exist', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      groupId: 'group-1',
      role: 'MEMBER',
    })
    ;(prisma.group.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/groups/group-1')
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await GET(req, { params })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Group not found')
  })

  it('should return group with members when user is a member', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      groupId: 'group-1',
      role: 'ADMIN',
    })
    ;(prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup)
    ;(prisma.groupInvitation.findMany as jest.Mock).mockResolvedValue([])

    const req = new Request('http://localhost:3000/api/groups/group-1')
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await GET(req, { params })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.memberships).toHaveLength(2)
    expect(data.memberships[0].user.email).toBe('alice@example.com')
    expect(data.memberships[1].user.email).toBe('bob@example.com')
    expect(data.pendingInvitations).toEqual([])
  })

  it('should include memberships with proper ordering', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      groupId: 'group-1',
      role: 'ADMIN',
    })
    ;(prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup)
    ;(prisma.groupInvitation.findMany as jest.Mock).mockResolvedValue([])

    const req = new Request('http://localhost:3000/api/groups/group-1')
    const params = Promise.resolve({ groupId: 'group-1' })
    await GET(req, { params })

    expect(prisma.group.findUnique).toHaveBeenCalledWith({
      where: { id: 'group-1' },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: [
            { role: 'desc' },
            { joinedAt: 'asc' }
          ]
        }
      }
    })
  })

  it('should allow non-admin members to view group', async () => {
    const regularUser = {
      id: 'user-2',
      email: 'bob@example.com',
      name: 'Bob',
    }

    ;(getCurrentUser as jest.Mock).mockResolvedValue(regularUser)
    ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-2',
      groupId: 'group-1',
      role: 'MEMBER',
    })
    ;(prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup)

    const req = new Request('http://localhost:3000/api/groups/group-1')
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await GET(req, { params })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.memberships).toEqual(mockGroup.memberships)
    expect(data.pendingInvitations).toEqual([])
  })

  it('should return 500 on internal error', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupMembership.findUnique as jest.Mock).mockRejectedValue(
      new Error('Database error')
    )

    const req = new Request('http://localhost:3000/api/groups/group-1')
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await GET(req, { params })

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Internal server error')
  })
})
