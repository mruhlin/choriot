import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"
import { z } from "zod"

const assignSchema = z.object({
  userId: z.string(),
  dueDate: z.string().datetime(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ choreId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const { choreId } = await params
    const body = await req.json()
    const { userId, dueDate } = assignSchema.parse(body)

    // Get chore and verify access
    const chore = await prisma.chore.findUnique({
      where: { id: choreId },
      include: { group: true }
    })

    if (!chore) {
      return NextResponse.json(
        { error: "Chore not found" },
        { status: 404 }
      )
    }

    // Verify user has permission
    if (chore.groupId) {
      const membership = await prisma.groupMembership.findUnique({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId: chore.groupId
          }
        }
      })

      if (!membership) {
        return NextResponse.json(
          { error: "You are not a member of this group" },
          { status: 403 }
        )
      }
    } else if (chore.createdById !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to assign this chore" },
        { status: 403 }
      )
    }

    // Create assignment
    const assignment = await prisma.choreAssignment.create({
      data: {
        choreId,
        userId,
        dueDate: new Date(dueDate),
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
          }
        }
      }
    })

    return NextResponse.json(assignment, { status: 201 })
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
