import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import GroupDetailClient from "./group-detail-client"

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const { groupId } = await params

  // Check if user is a member of the group
  const membership = await prisma.groupMembership.findUnique({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId,
      }
    }
  })

  if (!membership) {
    redirect("/dashboard/groups")
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
    redirect("/dashboard/groups")
  }

  const isAdmin = membership.role === "ADMIN"

  return (
    <GroupDetailClient
      group={group}
      currentUserId={session.user.id}
      isAdmin={isAdmin}
    />
  )
}
