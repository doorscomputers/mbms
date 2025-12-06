import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, canManageRoute } from '@/lib/auth-utils'

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
    const includeOperator = searchParams.get('includeOperator') === 'true'
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (activeOnly) {
      where.isActive = true
    }

    // Filter by operator for OPERATOR role
    if (currentUser.role === 'OPERATOR' && currentUser.operatorId) {
      where.operatorId = currentUser.operatorId
    }

    // Filter by route for ROUTE_ADMIN (through operator.routeId)
    if (currentUser.role === 'ROUTE_ADMIN' && currentUser.routeId) {
      where.operator = { routeId: currentUser.routeId }
    }

    const buses = await prisma.bus.findMany({
      where,
      include: {
        operator: includeOperator ? { include: { route: true } } : true,
        defaultDriver: true, // Always include default driver
      },
      orderBy: { busNumber: 'asc' },
    })

    return NextResponse.json({ success: true, data: buses })
  } catch (error) {
    console.error('Error fetching buses:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch buses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    // Only SUPER_ADMIN and ROUTE_ADMIN can create buses
    if (!(await canManageRoute())) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { busNumber, plateNumber, model, capacity, operatorId, defaultDriverId } = body

    if (!busNumber) {
      return NextResponse.json(
        { success: false, error: 'Bus number is required' },
        { status: 400 }
      )
    }

    // ROUTE_ADMIN can only create buses for operators in their route
    if (currentUser?.role === 'ROUTE_ADMIN' && operatorId) {
      const operator = await prisma.operator.findUnique({ where: { id: operatorId } })
      if (!operator || operator.routeId !== currentUser.routeId) {
        return NextResponse.json(
          { success: false, error: 'You can only create buses for operators in your route' },
          { status: 403 }
        )
      }
    }

    const bus = await prisma.bus.create({
      data: {
        busNumber,
        plateNumber: plateNumber || null,
        model: model || null,
        capacity: capacity ? parseInt(capacity) : null,
        operatorId: operatorId || null,
        defaultDriverId: defaultDriverId || null,
      },
      include: { operator: { include: { route: true } }, defaultDriver: true },
    })

    return NextResponse.json({ success: true, data: bus }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating bus:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Bus number or plate number already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create bus' },
      { status: 500 }
    )
  }
}
