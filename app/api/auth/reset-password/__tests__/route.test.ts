import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
    passwordResetToken: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
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

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should reset password with valid token', async () => {
    const mockResetToken = {
      id: 'token-1',
      userId: 'user-1',
      token: 'hashed-token',
      expires: new Date(Date.now() + 60 * 60 * 1000),
      user: {
        id: 'user-1',
        email: 'test@example.com',
      },
    }

    ;(prisma.passwordResetToken.findMany as jest.Mock).mockResolvedValue([mockResetToken])
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password')
    ;(prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    })
    ;(prisma.passwordResetToken.delete as jest.Mock).mockResolvedValue(mockResetToken)

    const req = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token',
        password: 'newpassword123',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Password has been reset successfully')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'new-hashed-password' }
    })
    expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { id: 'token-1' }
    })
  })

  it('should return error for invalid token', async () => {
    ;(prisma.passwordResetToken.findMany as jest.Mock).mockResolvedValue([])

    const req = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'invalid-token',
        password: 'newpassword123',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid or expired reset token')
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('should return error for expired token', async () => {
    // findMany filters out expired tokens, so return empty array
    ;(prisma.passwordResetToken.findMany as jest.Mock).mockResolvedValue([])

    const req = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'expired-token',
        password: 'newpassword123',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid or expired reset token')
  })

  it('should return error for password less than 6 characters', async () => {
    const req = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token',
        password: '12345',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid data')
    expect(data.details).toBeDefined()
  })

  it('should handle multiple tokens and find matching one', async () => {
    const mockTokens = [
      {
        id: 'token-1',
        userId: 'user-1',
        token: 'hashed-token-1',
        expires: new Date(Date.now() + 60 * 60 * 1000),
        user: { id: 'user-1', email: 'user1@example.com' },
      },
      {
        id: 'token-2',
        userId: 'user-2',
        token: 'hashed-token-2',
        expires: new Date(Date.now() + 60 * 60 * 1000),
        user: { id: 'user-2', email: 'user2@example.com' },
      },
    ]

    ;(prisma.passwordResetToken.findMany as jest.Mock).mockResolvedValue(mockTokens)
    ;(bcrypt.compare as jest.Mock)
      .mockResolvedValueOnce(false) // first token doesn't match
      .mockResolvedValueOnce(true)  // second token matches
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password')
    ;(prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user-2',
      email: 'user2@example.com',
    })
    ;(prisma.passwordResetToken.delete as jest.Mock).mockResolvedValue(mockTokens[1])

    const req = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token-2',
        password: 'newpassword123',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Password has been reset successfully')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { password: 'new-hashed-password' }
    })
    expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { id: 'token-2' }
    })
  })

  it('should handle database errors gracefully', async () => {
    ;(prisma.passwordResetToken.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

    const req = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token',
        password: 'newpassword123',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should delete token after successful password reset', async () => {
    const mockResetToken = {
      id: 'token-1',
      userId: 'user-1',
      token: 'hashed-token',
      expires: new Date(Date.now() + 60 * 60 * 1000),
      user: {
        id: 'user-1',
        email: 'test@example.com',
      },
    }

    ;(prisma.passwordResetToken.findMany as jest.Mock).mockResolvedValue([mockResetToken])
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password')
    ;(prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
    })
    ;(prisma.passwordResetToken.delete as jest.Mock).mockResolvedValue(mockResetToken)

    const req = new Request('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token',
        password: 'newpassword123',
      }),
    })

    await POST(req)

    expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { id: 'token-1' }
    })
  })
})
