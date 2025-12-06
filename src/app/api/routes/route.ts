import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, isSuperAdmin } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const includeOperators = searchParams.get('includeOperators') === 'true'
    const includeCount = searchParams.get('includeCount') === 'true'

    // Build where clause
    const where: { isActive?: boolean } = {}
    if (activeOnly) {
      where.isActive = true
    }

    // ROUTE_ADMIN can only see their own route
    if (currentUser.role === 'ROUTE_ADMIN' && currentUser.routeId) {
      const route = await prisma.route.findUnique({
        where: { id: currentUser.routeId },
        include: includeOperators ? {
          operators: { where: { isActive: true } },
          _count: includeCount ? { select: { operators: true, drivers: true } } : undefined
        } : {
          _count: includeCount ? { select: { operators: true, drivers: true } } : undefined
        }
      })

      return NextResponse.json({ success: true, data: route ? [route] : [] })
    }

    // SUPER_ADMIN sees all routes
    const routes = await prisma.route.findMany({
      where,
      include: includeOperators ? {
        operators: { where: { isActive: true } },
        _count: includeCount ? { select: { operators: true, drivers: true } } : undefined
      } : {
        _count: includeCount ? { select: { operators: true, drivers: true } } : undefined
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: routes })
  } catch (error) {
    console.error('Error fetching routes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch routes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only SUPER_ADMIN can create routes
    if (!(await isSuperAdmin())) {
      return NextResponse.json(
        { success: false, error: 'Super Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, operatorSharePercent, driverSharePercent } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Route name is required' },
        { status: 400 }
      )
    }

    // Check if route name already exists
    const existing = await prisma.route.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Route name already exists' },
        { status: 400 }
      )
    }

    const route = await prisma.route.create({
      data: {
        name,
        description: description || null,
        operatorSharePercent: operatorSharePercent ?? 60,
        driverSharePercent: driverSharePercent ?? 40,
      },
    })

    return NextResponse.json({ success: true, data: route }, { status: 201 })
  } catch (error) {
    console.error('Error creating route:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create route' },
      { status: 500 }
    )
  }
}
