import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // Find all non-expired tokens
    const resetTokens = await prisma.passwordResetToken.findMany({
      where: {
        expires: {
          gt: new Date() // greater than current time (not expired)
        }
      },
      include: {
        user: true
      }
    })

    // Find the matching token by comparing hashes
    let matchedToken = null
    for (const resetToken of resetTokens) {
      const isMatch = await bcrypt.compare(token, resetToken.token)
      if (isMatch) {
        matchedToken = resetToken
        break
      }
    }

    if (!matchedToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user's password
    await prisma.user.update({
      where: { id: matchedToken.userId },
      data: { password: hashedPassword }
    })

    // Delete the used reset token
    await prisma.passwordResetToken.delete({
      where: { id: matchedToken.id }
    })

    return NextResponse.json({ 
      message: "Password has been reset successfully" 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
