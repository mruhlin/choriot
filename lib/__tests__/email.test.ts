import { sendEmail, sendPasswordResetEmail } from '../email'

describe('email service', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    delete process.env.NODE_ENV
  })

  describe('sendEmail', () => {
    it('should log email to console in development', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test email content',
      }

      await sendEmail(options)

      expect(consoleSpy).toHaveBeenCalled()
      const logOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(logOutput).toContain('EMAIL (Development Mode - Not Actually Sent)')
      expect(logOutput).toContain('To: test@example.com')
      expect(logOutput).toContain('Subject: Test Subject')
      expect(logOutput).toContain('Test email content')
    })

    it('should log HTML content when provided', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Text content',
        html: '<p>HTML content</p>',
      }

      await sendEmail(options)

      const logOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(logOutput).toContain('HTML Content:')
      expect(logOutput).toContain('<p>HTML content</p>')
    })

    it('should throw error in production mode', async () => {
      process.env.NODE_ENV = 'production'

      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test email content',
      }

      await expect(sendEmail(options)).rejects.toThrow(
        'Production email sending not yet implemented'
      )
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct content', async () => {
      process.env.NEXTAUTH_URL = 'http://localhost:3000'
      const email = 'user@example.com'
      const resetToken = 'test-reset-token'

      await sendPasswordResetEmail(email, resetToken)

      expect(consoleSpy).toHaveBeenCalled()
      const logOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      
      expect(logOutput).toContain('To: user@example.com')
      expect(logOutput).toContain('Subject: Reset Your Choriot Password')
      expect(logOutput).toContain('reset your password')
      expect(logOutput).toContain(`http://localhost:3000/reset-password?token=${resetToken}`)
      expect(logOutput).toContain('expire in 1 hour')
    })

    it('should use default base URL if NEXTAUTH_URL not set', async () => {
      delete process.env.NEXTAUTH_URL
      const email = 'user@example.com'
      const resetToken = 'test-reset-token'

      await sendPasswordResetEmail(email, resetToken)

      const logOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(logOutput).toContain('http://localhost:3000/reset-password?token=test-reset-token')
    })

    it('should include both text and HTML versions', async () => {
      const email = 'user@example.com'
      const resetToken = 'test-reset-token'

      await sendPasswordResetEmail(email, resetToken)

      const logOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      
      expect(logOutput).toContain('Text Content:')
      expect(logOutput).toContain('HTML Content:')
      expect(logOutput).toContain('<!DOCTYPE html>')
      expect(logOutput).toContain('Reset Password</a>')
    })
  })
})
