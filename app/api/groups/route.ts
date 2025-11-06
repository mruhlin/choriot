import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"
import { z } from "zod"

const createGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

// GET /api/groups - Get all groups for current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const groups = await prisma.group.findMany({
      where: {
        memberships: {
          some: {
            userId: user.id
          }
        }
      },
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
          }
        },
        _count: {
          select: {
            chores: true,
          }
        }
      }
    })

    return NextResponse.json(groups)
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/groups - Create a new group
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const body = await req.json()
    const { name, description } = createGroupSchema.parse(body)

    const group = await prisma.group.create({
      data: {
        name,
        description,
        memberships: {
          create: {
            userId: user.id,
            role: "ADMIN"
          }
        }
      },
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
          }
        }
      }
    })

    return NextResponse.json(group, { status: 201 })
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
