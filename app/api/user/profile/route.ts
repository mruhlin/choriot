import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().nullable(),
})

// GET /api/user/profile - Get current user's profile
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
      }
    })

    if (!profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(profile)
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH /api/user/profile - Update current user's profile
export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const body = await req.json()
    
    // Check if email is being changed (not allowed)
    if ('email' in body) {
      return NextResponse.json(
        { error: "Email cannot be changed" },
        { status: 400 }
      )
    }

    const { name } = updateProfileSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
