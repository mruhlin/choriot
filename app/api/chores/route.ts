import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"
import { z } from "zod"
import { RecurrenceType, Prisma } from "@/generated/prisma/index"

const createChoreSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  groupId: z.string().optional(),
  recurrenceType: z.enum(["NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).default("NONE"),
  recurrenceValue: z.number().int().optional(),
  startDate: z.string().datetime().optional(),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format
  points: z.number().int().min(1).default(1),
})

// GET /api/chores - Get all chores for current user
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get("groupId")

    // Get all groups user is a member of
    const userGroupIds = await prisma.groupMembership.findMany({
      where: { userId: user.id },
      select: { groupId: true }
    })
    const groupIds = userGroupIds.map(g => g.groupId)

    const whereClause: Prisma.ChoreWhereInput = {
      OR: [
        // Private chores
        { createdById: user.id, groupId: null },
        // Group chores
        { groupId: { in: groupIds } }
      ],
      isActive: true
    }

    // Filter by specific group if requested
    if (groupId) {
      whereClause.groupId = groupId
    }

    const chores = await prisma.chore.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        group: {
          select: {
            id: true,
            name: true,
          }
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            dueDate: 'asc'
          }
        },
        completions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: {
            completedAt: 'desc'
          },
          take: 5 // Last 5 completions
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(chores)
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/chores - Create a new chore
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const body = await req.json()
    const data = createChoreSchema.parse(body)

    // If groupId provided, verify user is a member
    if (data.groupId) {
      const membership = await prisma.groupMembership.findUnique({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId: data.groupId
          }
        }
      })

      if (!membership) {
        return NextResponse.json(
          { error: "You are not a member of this group" },
          { status: 403 }
        )
      }
    }

    const chore = await prisma.chore.create({
      data: {
        title: data.title,
        description: data.description,
        createdById: user.id,
        groupId: data.groupId,
        recurrenceType: data.recurrenceType as RecurrenceType,
        recurrenceValue: data.recurrenceValue,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        dueTime: data.dueTime,
        points: data.points,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        group: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json(chore, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
