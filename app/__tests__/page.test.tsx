import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import Home from '../page'

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
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

  it('should log "hello world" to console', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    await Home()

    expect(consoleLogSpy).toHaveBeenCalledWith('hello world')
  })

  it('should redirect to dashboard when user is logged in', async () => {
    const mockSession = {
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

    await Home()

    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('should log "hello world" even when user is not logged in', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    await Home()

    expect(consoleLogSpy).toHaveBeenCalledWith('hello world')
  })
})
