import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/email', () => ({
  sendPasswordResetEmail: jest.fn(),
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

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return success message for valid email', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    }

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token')
    ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
    ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      token: 'hashed-token',
      expires: new Date(),
    })
    ;(sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined)

    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe("If that email address is in our system, we've sent a password reset link to it.")
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' }
    })
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' }
    })
    expect(prisma.passwordResetToken.create).toHaveBeenCalled()
    expect(sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', expect.any(String))
  })

  it('should return success message for non-existent email (no enumeration)', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@example.com' }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe("If that email address is in our system, we've sent a password reset link to it.")
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled()
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('should return error for invalid email format', async () => {
    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email' }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid email address')
  })

  it('should handle database errors gracefully', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should delete existing reset tokens before creating new one', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    }

    const callOrder: string[] = []
    
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token')
    ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockImplementation(() => {
      callOrder.push('deleteMany')
      return Promise.resolve({ count: 1 })
    })
    ;(prisma.passwordResetToken.create as jest.Mock).mockImplementation(() => {
      callOrder.push('create')
      return Promise.resolve({
        id: 'token-1',
        userId: 'user-1',
        token: 'hashed-token',
        expires: new Date(),
      })
    })
    ;(sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined)

    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    await POST(req)

    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' }
    })
    expect(callOrder).toEqual(['deleteMany', 'create'])
  })

  it('should create token with 1 hour expiration', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    }

    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now)

    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token')
    ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
    ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      token: 'hashed-token',
      expires: new Date(now + 60 * 60 * 1000),
    })
    ;(sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined)

    const req = new Request('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    await POST(req)

    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        token: 'hashed-token',
        expires: new Date(now + 60 * 60 * 1000),
      }
    })
  })
})
