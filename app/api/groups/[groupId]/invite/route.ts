import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"
import { z } from "zod"
import { addDays } from "date-fns"

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

    // Check if user is already a member
    const existingMembership = await prisma.groupMembership.findFirst({
      where: {
        groupId,
        user: { email }
      }
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 400 }
      )
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.groupInvitation.findFirst({
      where: {
        groupId,
        invitedEmail: email,
        status: "PENDING"
      }
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Invitation already sent" },
        { status: 400 }
      )
    }

    // Create invitation
    const expiresAt = addDays(new Date(), 7)
    const invitation = await prisma.groupInvitation.create({
      data: {
        groupId,
        invitedByUserId: user.id,
        invitedEmail: email,
        expiresAt,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          }
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json(invitation, { status: 201 })
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
