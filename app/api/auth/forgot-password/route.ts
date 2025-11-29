import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { sendPasswordResetEmail } from "@/lib/email"

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Always return success to prevent email enumeration attacks
    // This prevents attackers from determining which emails are registered
    if (!user) {
      // Add a small delay to make timing attacks harder
      await new Promise(resolve => setTimeout(resolve, 100))
      return NextResponse.json({ 
        message: "If that email address is in our system, we've sent a password reset link to it." 
      })
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex')
    
    // Hash the token before storing (same security as passwords)
    const hashedToken = await bcrypt.hash(resetToken, 10)

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    })

    // Create new reset token (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      }
    })

    // Send password reset email (logs to console in development)
    await sendPasswordResetEmail(email, resetToken)

    return NextResponse.json({ 
      message: "If that email address is in our system, we've sent a password reset link to it." 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }
    
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
