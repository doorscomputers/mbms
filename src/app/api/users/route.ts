import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getCurrentUser, isSuperAdmin } from '@/lib/auth-utils'

export async function GET() {
  try {
    // Only SUPER_ADMIN can list all users
    if (!(await isSuperAdmin())) {
      return NextResponse.json(
        { success: false, error: 'Super Admin access required' },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      include: {
        operator: true,
        route: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Remove passwords from response
    const safeUsers = users.map(({ password: _, ...user }) => user)

    return NextResponse.json({ success: true, data: safeUsers })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only SUPER_ADMIN can create users
    if (!(await isSuperAdmin())) {
      return NextResponse.json(
        { success: false, error: 'Super Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { username, password, name, role, operatorId, routeId } = body

    if (!username || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Username, password, and name are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['SUPER_ADMIN', 'ROUTE_ADMIN', 'OPERATOR']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }

    // ROUTE_ADMIN must have a routeId
    if (role === 'ROUTE_ADMIN' && !routeId) {
      return NextResponse.json(
        { success: false, error: 'Route Admin must be assigned to a route' },
        { status: 400 }
      )
    }

    // OPERATOR must have an operatorId
    if (role === 'OPERATOR' && !operatorId) {
      return NextResponse.json(
        { success: false, error: 'Operator user must be linked to an operator' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username already in use' },
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
        role: role || 'OPERATOR',
        operatorId: role === 'OPERATOR' ? operatorId : null,
        routeId: role === 'ROUTE_ADMIN' ? routeId : null,
      },
      include: {
        operator: true,
        route: true,
      },
    })

    // Remove password from response
    const { password: _, ...safeUser } = user

    return NextResponse.json({ success: true, data: safeUser }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
