import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    groupInvitation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    groupMembership: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
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

describe('/api/invitations/[invitationId]/accept POST', () => {
  const mockUser = {
    id: 'user-1',
    email: 'invited@example.com',
    name: 'Invited User',
  }

  const mockInvitation = {
    id: 'invitation-1',
    groupId: 'group-1',
    invitedByUserId: 'admin-1',
    invitedEmail: 'invited@example.com',
    status: 'PENDING',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    respondedAt: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/invitations/invitation-1/accept', {
      method: 'POST',
    })
    const params = Promise.resolve({ invitationId: 'invitation-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(401)
  })

  it('should return 404 when invitation not found', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupInvitation.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/invitations/invitation-1/accept', {
      method: 'POST',
    })
    const params = Promise.resolve({ invitationId: 'invitation-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Invitation not found')
  })

  it('should return 403 when invitation is not for the current user', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupInvitation.findUnique as jest.Mock).mockResolvedValue({
      ...mockInvitation,
      invitedEmail: 'other@example.com',
    })

    const req = new Request('http://localhost:3000/api/invitations/invitation-1/accept', {
      method: 'POST',
    })
    const params = Promise.resolve({ invitationId: 'invitation-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('This invitation is not for you')
  })

  it('should return 400 when invitation has already been responded to', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupInvitation.findUnique as jest.Mock).mockResolvedValue({
      ...mockInvitation,
      status: 'ACCEPTED',
    })

    const req = new Request('http://localhost:3000/api/invitations/invitation-1/accept', {
      method: 'POST',
    })
    const params = Promise.resolve({ invitationId: 'invitation-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('This invitation has already been responded to')
  })

  it('should return 400 when invitation has expired', async () => {
    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupInvitation.findUnique as jest.Mock).mockResolvedValue({
      ...mockInvitation,
      expiresAt: new Date(Date.now() - 1000),
    })

    const req = new Request('http://localhost:3000/api/invitations/invitation-1/accept', {
      method: 'POST',
    })
    const params = Promise.resolve({ invitationId: 'invitation-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('This invitation has expired')
    expect(prisma.groupInvitation.update).toHaveBeenCalledWith({
      where: { id: 'invitation-1' },
      data: { status: 'EXPIRED' }
    })
  })

  it('should accept invitation and create membership', async () => {
    const mockMembership = {
      id: 'membership-1',
      userId: 'user-1',
      groupId: 'group-1',
      role: 'MEMBER',
      group: {
        id: 'group-1',
        name: 'Test Group',
        description: 'Test description',
      },
    }

    ;(getCurrentUser as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.groupInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation)
    ;(prisma.groupMembership.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.$transaction as jest.Mock).mockResolvedValue([mockMembership, {}])

    const req = new Request('http://localhost:3000/api/invitations/invitation-1/accept', {
      method: 'POST',
    })
    const params = Promise.resolve({ invitationId: 'invitation-1' })
    const response = await POST(req, { params })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data).toEqual(mockMembership)
  })
})
