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

    // Update invitation to declined
    const updatedInvitation = await prisma.groupInvitation.update({
      where: { id: invitationId },
      data: {
        status: "DECLINED",
        respondedAt: new Date()
      }
    })

    return NextResponse.json(updatedInvitation)
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
