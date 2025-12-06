import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// This endpoint creates an admin user only if no admin exists
// This is for initial setup only
export async function POST(request: NextRequest) {
  try {
    // Check if any admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    })

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin already exists. Use admin panel to create more users.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { username, password, name } = body

    if (!username || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Username, password, and name are required' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: 'SUPER_ADMIN',
      },
    })

    // Remove password from response
    const { password: _, ...safeUser } = user

    return NextResponse.json({
      success: true,
      data: safeUser,
      message: 'Admin account created successfully. You can now login.'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create admin' },
      { status: 500 }
    )
  }
}

// Check if setup is needed
export async function GET() {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    })

    return NextResponse.json({
      success: true,
      setupRequired: !existingAdmin
    })
  } catch (error) {
    console.error('Error checking setup:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check setup' },
      { status: 500 }
    )
  }
}
