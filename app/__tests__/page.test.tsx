import Home from '../page'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

describe('Home Page', () => {
  let consoleLogSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  it('should log "hello world" to console when page loads', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    await Home()

    expect(consoleLogSpy).toHaveBeenCalledWith('hello world')
  })

  it('should log "hello world" even when user is authenticated', async () => {
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

    await Home()

    expect(consoleLogSpy).toHaveBeenCalledWith('hello world')
  })

  it('should log "hello world" exactly once per page load', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    await Home()

    expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    expect(consoleLogSpy).toHaveBeenCalledWith('hello world')
  })

  it('should redirect to dashboard when user is authenticated after logging hello world', async () => {
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

    await Home()

    expect(consoleLogSpy).toHaveBeenCalledWith('hello world')
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })
})
