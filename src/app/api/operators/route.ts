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
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const includeBuses = searchParams.get('includeBuses') === 'true'

    // Build where clause based on user role
    const where: { isActive?: boolean; routeId?: string } = {}
    if (activeOnly) {
      where.isActive = true
    }

    // ROUTE_ADMIN can only see operators in their route
    if (currentUser.role === 'ROUTE_ADMIN' && currentUser.routeId) {
      where.routeId = currentUser.routeId
    }

    // OPERATOR can only see their own operator record
    if (currentUser.role === 'OPERATOR' && currentUser.operatorId) {
      const operator = await prisma.operator.findUnique({
        where: { id: currentUser.operatorId },
        include: {
          route: true,
          ...(includeBuses ? { buses: { where: { isActive: true } } } : {}),
        },
      })
      return NextResponse.json({ success: true, data: operator ? [operator] : [] })
    }

    const operators = await prisma.operator.findMany({
      where,
      include: {
        route: true,
        ...(includeBuses ? { buses: { where: { isActive: true } } } : {}),
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: operators })
  } catch (error) {
    console.error('Error fetching operators:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch operators' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    // Only SUPER_ADMIN and ROUTE_ADMIN can create operators
    if (!(await canManageRoute())) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, contactNumber, address, sharePercent, routeId } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Operator name is required' },
        { status: 400 }
      )
    }

    // Determine the routeId to use
    let finalRouteId = routeId || null

    // ROUTE_ADMIN must assign to their own route
    if (currentUser?.role === 'ROUTE_ADMIN') {
      if (routeId && routeId !== currentUser.routeId) {
        return NextResponse.json(
          { success: false, error: 'You can only create operators in your assigned route' },
          { status: 403 }
        )
      }
      finalRouteId = currentUser.routeId
    }

    const operator = await prisma.operator.create({
      data: {
        name,
        contactNumber: contactNumber || null,
        address: address || null,
        sharePercent: sharePercent ? parseFloat(sharePercent) : 0,
        routeId: finalRouteId,
      },
      include: { route: true },
    })

    return NextResponse.json({ success: true, data: operator }, { status: 201 })
  } catch (error) {
    console.error('Error creating operator:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create operator' },
      { status: 500 }
    )
  }
}
