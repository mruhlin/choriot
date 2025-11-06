import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"
import { z } from "zod"

const completeSchema = z.object({
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
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
    const { dueDate, notes } = completeSchema.parse(body)

    // Get chore and verify access
    const chore = await prisma.chore.findUnique({
      where: { id: choreId },
      include: { 
        group: true,
        assignments: {
          where: {
            userId: user.id,
            dueDate: new Date(dueDate)
          }
        }
      }
    })

    if (!chore) {
      return NextResponse.json(
        { error: "Chore not found" },
        { status: 404 }
      )
    }

    // Verify user has access to this chore
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
        { error: "You do not have permission to complete this chore" },
        { status: 403 }
      )
    }

    // Check if already completed
    const existingCompletion = await prisma.choreCompletion.findFirst({
      where: {
        choreId,
        userId: user.id,
        dueDate: new Date(dueDate)
      }
    })

    if (existingCompletion) {
      return NextResponse.json(
        { error: "This chore instance has already been completed" },
        { status: 400 }
      )
    }

    // Create completion
    const completion = await prisma.choreCompletion.create({
      data: {
        choreId,
        userId: user.id,
        dueDate: new Date(dueDate),
        notes,
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
            points: true,
          }
        }
      }
    })

    return NextResponse.json(completion, { status: 201 })
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
