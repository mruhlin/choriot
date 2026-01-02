import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import InvitationsClient from "./invitations-client"

export default async function InvitationsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Fetch full user data including timezone
  const userData = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, timezone: true }
  })

  if (!userData) {
    redirect("/login")
  }

  const userTimezone = userData.timezone || "America/Los_Angeles"

  // Fetch pending invitations for current user
  const invitations = await prisma.groupInvitation.findMany({
    where: {
      invitedEmail: userData.email,
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

  return <InvitationsClient invitations={invitations} userTimezone={userTimezone} />
}
