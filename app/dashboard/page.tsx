import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateChoreInstances } from "@/lib/chore-schedule"
import { addDays, format, startOfDay } from "date-fns"
import Link from "next/link"
import DashboardClient from "./dashboard-client"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Fetch user's groups
  const userGroupIds = await prisma.groupMembership.findMany({
    where: { userId: session.user.id },
    select: { groupId: true }
  })
  const groupIds = userGroupIds.map(g => g.groupId)

  // Fetch chores
  const chores = await prisma.chore.findMany({
    where: {
      OR: [
        { createdById: session.user.id, groupId: null },
        { groupId: { in: groupIds } }
      ],
      isActive: true
    },
    include: {
      group: { select: { id: true, name: true } },
      assignments: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      completions: {
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      }
    }
  })

  // Generate chore instances for the next 14 days
  const today = startOfDay(new Date())
  const endDate = addDays(today, 14)
  const choreInstances = generateChoreInstances(chores, today, endDate)

  // Fetch groups
  const groups = await prisma.group.findMany({
    where: {
      memberships: {
        some: { userId: session.user.id }
      }
    },
    include: {
      memberships: {
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }
    }
  })

  return <DashboardClient 
    user={session.user} 
    choreInstances={choreInstances}
    groups={groups}
  />
}
