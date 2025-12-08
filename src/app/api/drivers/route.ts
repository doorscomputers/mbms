import { NextRequest, NextResponse } from 'next/server'
import prisma, { withRetry } from '@/lib/prisma'
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

    // Build where clause based on user role
    const where: { isActive?: boolean; routeId?: string } = {}
    if (activeOnly) {
      where.isActive = true
    }

    // ROUTE_ADMIN can only see drivers in their route
    if (currentUser.role === 'ROUTE_ADMIN' && currentUser.routeId) {
      where.routeId = currentUser.routeId
    }

    const drivers = await withRetry(() => prisma.driver.findMany({
      where,
      include: { route: true },
      orderBy: { name: 'asc' },
    }))

    return NextResponse.json({ success: true, data: drivers })
  } catch (error) {
    console.error('Error fetching drivers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch drivers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    // Only SUPER_ADMIN and ROUTE_ADMIN can create drivers
    if (!(await canManageRoute())) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, licenseNumber, contactNumber, address, sharePercent, routeId } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Driver name is required' },
        { status: 400 }
      )
    }

    // Determine the routeId to use
    let finalRouteId = routeId || null

    // ROUTE_ADMIN must assign to their own route
    if (currentUser?.role === 'ROUTE_ADMIN') {
      if (routeId && routeId !== currentUser.routeId) {
        return NextResponse.json(
          { success: false, error: 'You can only create drivers in your assigned route' },
          { status: 403 }
        )
      }
      finalRouteId = currentUser.routeId
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        licenseNumber: licenseNumber || null,
        contactNumber: contactNumber || null,
        address: address || null,
        sharePercent: sharePercent ? parseFloat(sharePercent) : 0,
        routeId: finalRouteId,
      },
      include: { route: true },
    })

    return NextResponse.json({ success: true, data: driver }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating driver:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'License number already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create driver' },
      { status: 500 }
    )
  }
}
