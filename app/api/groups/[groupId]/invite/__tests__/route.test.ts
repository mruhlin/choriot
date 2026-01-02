import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'
import { addDays } from 'date-fns'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    groupMembership: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    groupInvitation: {
      findFirst: jest.fn(),
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
    json: jest.fn((data, init) => ({
      json: jest.fn().mockResolvedValue(data),
      status: init?.status || 200,
    })),
  },
}))

jest.mock('date-fns', () => ({
  addDays: jest.fn((date, days) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }),
}))

describe('/api/groups/[groupId]/invite POST', () => {
  const mockUser = {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
  }

  const mockInvitation = {
    id: 'invitation-1',
    groupId: 'group-1',
    invitedByUserId: 'user-1',
    invitedEmail: 'newuser@example.com',
    status: 'PENDING',
    createdAt: new Date(),
    expiresAt: addDays(new Date(), 7),
    respondedAt: null,
    group: {
      id: 'group-1',
      name: 'Test Group',
    },
    invitedBy: {
      id: 'user-1',
      name: 'Admin User',
      email: 'admin@example.com',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/groups/group-1/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'newuser@example.com' }),
    })
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(401)
  })

  it('should return 403 when user is not an admin', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      groupId: 'group-1',
      role: 'MEMBER',
    })

    const req = new Request('http://localhost:3000/api/groups/group-1/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'newuser@example.com' }),
    })
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('You must be a group admin to invite members')
  })

  it('should return 400 when email is already a member', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      groupId: 'group-1',
      role: 'ADMIN',
    })
    ;(prisma.groupMembership.findFirst as jest.Mock).mockResolvedValue({
      id: 'membership-1',
      userId: 'user-2',
      groupId: 'group-1',
    })

    const req = new Request('http://localhost:3000/api/groups/group-1/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'newuser@example.com' }),
    })
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('User is already a member')
  })

  it('should return 400 when invitation already exists', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      groupId: 'group-1',
      role: 'ADMIN',
    })
    ;(prisma.groupMembership.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.groupInvitation.findFirst as jest.Mock).mockResolvedValue({
      id: 'existing-invitation',
      status: 'PENDING',
    })

    const req = new Request('http://localhost:3000/api/groups/group-1/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'newuser@example.com' }),
    })
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invitation already sent')
  })

  it('should create invitation successfully', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      groupId: 'group-1',
      role: 'ADMIN',
    })
    ;(prisma.groupMembership.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.groupInvitation.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.groupInvitation.create as jest.Mock).mockResolvedValue(mockInvitation)

    const req = new Request('http://localhost:3000/api/groups/group-1/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'newuser@example.com' }),
    })
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data).toEqual(mockInvitation)
    expect(prisma.groupInvitation.create).toHaveBeenCalledWith({
      data: {
        groupId: 'group-1',
        invitedByUserId: 'user-1',
        invitedEmail: 'newuser@example.com',
        expiresAt: expect.any(Date),
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          }
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })
  })

  it('should return 400 for invalid email', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

    const req = new Request('http://localhost:3000/api/groups/group-1/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email' }),
    })
    const params = Promise.resolve({ groupId: 'group-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid data')
  })
})
