import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const { groupId } = await params

    // Check if user is a member of the group or not
    const membership = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId,
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Group not found or you are not a member" },
        { status: 404 }
      )
    }

    // Fetch group with all members
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: [
            { role: "desc" }, // ADMIN before MEMBER
            { joinedAt: "asc" }
          ]
        }
      }
    })

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      )
    }

    // Include pending invitations if user is admin
    let pendingInvitations: Array<{
      id: string
      groupId: string
      invitedByUserId: string
      invitedEmail: string
      status: string
      createdAt: Date
      expiresAt: Date
      respondedAt: Date | null
    }> = []
    if (membership.role === "ADMIN") {
      pendingInvitations = await prisma.groupInvitation.findMany({
        where: {
          groupId,
          status: "PENDING",
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    }

    return NextResponse.json({
      ...group,
      pendingInvitations
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
