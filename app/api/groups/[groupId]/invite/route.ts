import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"
import { z } from "zod"

const inviteSchema = z.object({
  email: z.string().email(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const { groupId } = await params
    const body = await req.json()
    const { email } = inviteSchema.parse(body)

    // Check if current user is admin of the group
    const membership = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId,
        }
      }
    })

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You must be a group admin to invite members" },
        { status: 403 }
      )
    }

    // Find user to invite
    const invitedUser = await prisma.user.findUnique({
      where: { email }
    })

    if (!invitedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId: invitedUser.id,
          groupId,
        }
      }
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 400 }
      )
    }

    // Add user to group
    const newMembership = await prisma.groupMembership.create({
      data: {
        userId: invitedUser.id,
        groupId,
        role: "MEMBER"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json(newMembership, { status: 201 })
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
