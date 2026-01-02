import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const { invitationId } = await params

    // Find the invitation
    const invitation = await prisma.groupInvitation.findUnique({
      where: { id: invitationId }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    // Verify invitation is for current user's email
    if (invitation.invitedEmail !== user.email) {
      return NextResponse.json(
        { error: "This invitation is not for you" },
        { status: 403 }
      )
    }

    // Check invitation is pending
    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "This invitation has already been responded to" },
        { status: 400 }
      )
    }

    // Check invitation hasn't expired
    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await prisma.groupInvitation.update({
        where: { id: invitationId },
        data: { status: "EXPIRED" }
      })
      
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: invitation.groupId,
        }
      }
    })

    if (existingMembership) {
      // Update invitation status anyway
      await prisma.groupInvitation.update({
        where: { id: invitationId },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date()
        }
      })
      
      return NextResponse.json(
        { error: "You are already a member of this group" },
        { status: 400 }
      )
    }

    // Create membership and update invitation in a transaction
    const [membership] = await prisma.$transaction([
      prisma.groupMembership.create({
        data: {
          userId: user.id,
          groupId: invitation.groupId,
          role: "MEMBER"
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          }
        }
      }),
      prisma.groupInvitation.update({
        where: { id: invitationId },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date()
        }
      })
    ])

    return NextResponse.json(membership, { status: 201 })
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
