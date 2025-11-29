import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import CompletedClient from "./completed-client"

export default async function CompletedPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Fetch full user data including timezone
  const userData = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, timezone: true }
  })

  if (!userData) {
    redirect("/login")
  }

  // Get all groups user is a member of
  const userGroupIds = await prisma.groupMembership.findMany({
    where: { userId: session.user.id },
    select: { groupId: true }
  })
  const groupIds = userGroupIds.map(g => g.groupId)

  // Fetch completed chores (personal + group chores)
  const completions = await prisma.choreCompletion.findMany({
    where: {
      chore: {
        OR: [
          // Personal chores completed by user
          { createdById: session.user.id, groupId: null },
          // Group chores (regardless of who completed them)
          { groupId: { in: groupIds } }
        ]
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      chore: {
        select: {
          id: true,
          title: true,
          description: true,
          points: true,
          group: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      }
    },
    orderBy: {
      completedAt: 'desc'
    },
    take: 50 // Initial page size
  })

  return <CompletedClient user={{...userData}} completions={completions} />
}
