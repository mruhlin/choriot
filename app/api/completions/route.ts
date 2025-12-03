import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"
import { Prisma } from "@/generated/prisma/index"

// GET /api/completions - Get completion history
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get("groupId")
    const userId = searchParams.get("userId")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Get all groups user is a member of
    const userGroupIds = await prisma.groupMembership.findMany({
      where: { userId: user.id },
      select: { groupId: true }
    })
    const groupIds = userGroupIds.map(g => g.groupId)

    const whereClause: Prisma.ChoreCompletionWhereInput = {
      chore: {
        OR: [
          // Private chores
          { createdById: user.id, groupId: null },
          // Group chores
          { groupId: { in: groupIds } }
        ]
      }
    }

    // Filter by specific group
    if (groupId && whereClause.chore) {
      whereClause.chore.groupId = groupId
    }

    // Filter by specific user
    if (userId) {
      whereClause.userId = userId
    }

    const completions = await prisma.choreCompletion.findMany({
      where: whereClause,
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
      take: limit
    })

    return NextResponse.json(completions)
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
