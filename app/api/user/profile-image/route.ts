import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth-helpers"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      )
    }

    // Upload to Vercel Blob
    let blob
    try {
      blob = await put(`profile-images/${user.id}-${Date.now()}.${file.name.split('.').pop()}`, file, {
        access: "public",
      })
    } catch (error) {
      console.error("Blob storage error:", error)
      return NextResponse.json(
        { error: "Failed to upload image to storage" },
        { status: 500 }
      )
    }

    // Update user's image URL in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { image: blob.url },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      }
    })

    return NextResponse.json({ 
      imageUrl: updatedUser.image,
      user: updatedUser 
    })
  } catch (error) {
    console.error("Profile image upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
