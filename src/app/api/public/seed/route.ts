import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET /api/seed - Create default users for all operators (also accepts POST)
export async function GET() {
  return seedDatabase()
}

export async function POST() {
  return seedDatabase()
}

async function seedDatabase() {
  try {
    const results: string[] = []

    // Create admin user if it doesn't exist
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      const admin = await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          name: 'Administrator',
          role: 'SUPER_ADMIN',
        }
      })
      results.push(`Created admin: ${admin.username} / password: admin123`)
    } else {
      results.push(`Admin already exists: ${existingAdmin.username}`)
    }

    // Get all operators that don't have a user account yet
    const operatorsWithoutUser = await prisma.operator.findMany({
      where: {
        user: null,
        isActive: true
      }
    })

    results.push(`Found ${operatorsWithoutUser.length} operators without user accounts`)

    // Default password for all operators
    const defaultPassword = 'password123'
    const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10)

    for (const operator of operatorsWithoutUser) {
      // Generate username from operator name (lowercase, replace spaces with dots)
      const username = operator.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '.') // Replace spaces with dots
        .trim()

      try {
        const user = await prisma.user.create({
          data: {
            username,
            password: hashedDefaultPassword,
            name: operator.name,
            role: 'OPERATOR',
            operatorId: operator.id,
          }
        })
        results.push(`Created: ${operator.name} => ${user.username} / password123`)
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          results.push(`Skipped (already exists): ${operator.name}`)
        } else {
          results.push(`Error for ${operator.name}: ${error}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Seed completed',
      results,
      credentials: {
        admin: 'admin / admin123',
        operators: '<operator.name> / password123'
      }
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to seed database' },
      { status: 500 }
    )
  }
}
