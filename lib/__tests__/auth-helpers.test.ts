import { getCurrentUser, requireAuth, unauthorizedResponse } from '../auth-helpers'
import { getServerSession } from 'next-auth'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('../auth', () => ({
  authOptions: {},
}))

describe('auth-helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCurrentUser', () => {
    it('should return user from session', async () => {
      const mockUser = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser,
      })

      const user = await getCurrentUser()

      expect(user).toEqual(mockUser)
      expect(getServerSession).toHaveBeenCalledTimes(1)
    })

    it('should return undefined when no session exists', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const user = await getCurrentUser()

      expect(user).toBeUndefined()
    })

    it('should return undefined when session has no user', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue({})

      const user = await getCurrentUser()

      expect(user).toBeUndefined()
    })
  })

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: 'user-1', name: 'Alice', email: 'alice@example.com' }
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: mockUser,
      })

      const user = await requireAuth()

      expect(user).toEqual(mockUser)
    })

    it('should throw error when not authenticated', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })

    it('should throw error when session has no user', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue({})

      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })
  })

  describe('unauthorizedResponse', () => {
    it('should return 401 response with error message', () => {
      const response = unauthorizedResponse()

      expect(response.status).toBe(401)
    })
  })
})
