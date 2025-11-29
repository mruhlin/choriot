/**
 * Email service for Choriot
 * 
 * In development/local environments, this service logs email contents to the console
 * instead of sending actual emails, similar to Rails' mailsafe gem.
 * 
 * This can be easily swapped with a real email service (e.g., SendGrid, AWS SES) in production.
 */

export interface EmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

/**
 * Send an email (or log it to console in development)
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  
  if (isDevelopment) {
    // Log email to console instead of sending
    console.log('\n' + '='.repeat(80))
    console.log('📧 EMAIL (Development Mode - Not Actually Sent)')
    console.log('='.repeat(80))
    console.log(`To: ${options.to}`)
    console.log(`Subject: ${options.subject}`)
    console.log('-'.repeat(80))
    console.log('Text Content:')
    console.log(options.text)
    if (options.html) {
      console.log('-'.repeat(80))
      console.log('HTML Content:')
      console.log(options.html)
    }
    console.log('='.repeat(80) + '\n')
  } else {
    // In production, this would integrate with a real email service
    // For now, throw an error to prevent silent failures
    throw new Error('Production email sending not yet implemented. Configure an email service provider.')
  }
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`
  
  const text = `
Hello,

You requested to reset your password for Choriot.

Please click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email.

Thanks,
The Choriot Team
`.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Reset Your Password</h2>
    <p>You requested to reset your password for Choriot.</p>
    <p>Please click the button below to reset your password:</p>
    <a href="${resetUrl}" class="button">Reset Password</a>
    <p>Or copy and paste this link into your browser:</p>
    <p>${resetUrl}</p>
    <p><strong>This link will expire in 1 hour.</strong></p>
    <p>If you did not request a password reset, please ignore this email.</p>
    <div class="footer">
      <p>Thanks,<br>The Choriot Team</p>
    </div>
  </div>
</body>
</html>
`.trim()

  await sendEmail({
    to: email,
    subject: 'Reset Your Choriot Password',
    text,
    html
  })
}
