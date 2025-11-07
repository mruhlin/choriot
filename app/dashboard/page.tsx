import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateChoreInstances } from "@/lib/chore-schedule"
import { addDays } from "date-fns"
import { toZonedTime, fromZonedTime } from "date-fns-tz"
import DashboardClient from "./dashboard-client"

export default async function DashboardPage() {
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

  const userTimezone = userData.timezone || "America/Los_Angeles"

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

  // Generate chore instances for the next 14 days in user's timezone
  const now = new Date()
  const todayInUserTz = toZonedTime(now, userTimezone)
  todayInUserTz.setHours(0, 0, 0, 0)
  const today = fromZonedTime(todayInUserTz, userTimezone)
  const endDate = addDays(today, 14)
  const choreInstances = generateChoreInstances(chores, today, endDate, userTimezone)

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
    user={{...userData}} 
    choreInstances={choreInstances}
    groups={groups}
  />
}
