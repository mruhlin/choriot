import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    // Get pending invitations for current user's email that haven't expired
    const invitations = await prisma.groupInvitation.findMany({
      where: {
        invitedEmail: user.email,
        status: "PENDING",
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(invitations)
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
