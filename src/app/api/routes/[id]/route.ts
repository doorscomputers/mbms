import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, isSuperAdmin } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // ROUTE_ADMIN can only view their own route
    if (currentUser.role === 'ROUTE_ADMIN' && currentUser.routeId !== id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        operators: {
          where: { isActive: true },
          include: { buses: { where: { isActive: true } } }
        },
        drivers: { where: { isActive: true } },
        _count: { select: { operators: true, drivers: true } }
      },
    })

    if (!route) {
      return NextResponse.json(
        { success: false, error: 'Route not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: route })
  } catch (error) {
    console.error('Error fetching route:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch route' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      isActive,
      operatorSharePercent,
      driverSharePercent,
      weekdayMinimumCollection,
      sundayMinimumCollection,
      defaultCoopContribution,
      driverBasePay,
      suspensionThreshold,
    } = body

    // Check if route exists
    const existing = await prisma.route.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Route not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only update settings for their own route
    const isRouteAdmin = currentUser.role === 'ROUTE_ADMIN' && currentUser.routeId === id
    const superAdmin = currentUser.role === 'SUPER_ADMIN'

    if (!superAdmin && !isRouteAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // ROUTE_ADMIN cannot change name, description, or isActive
    if (isRouteAdmin && (name || description !== undefined || isActive !== undefined)) {
      return NextResponse.json(
        { success: false, error: 'Route Admins can only update settings' },
        { status: 403 }
      )
    }

    // Check if new name conflicts with another route (SUPER_ADMIN only)
    if (superAdmin && name && name !== existing.name) {
      const nameExists = await prisma.route.findUnique({ where: { name } })
      if (nameExists) {
        return NextResponse.json(
          { success: false, error: 'Route name already exists' },
          { status: 400 }
        )
      }
    }

    const route = await prisma.route.update({
      where: { id },
      data: {
        // Only SUPER_ADMIN can update these
        ...(superAdmin ? {
          name: name || existing.name,
          description: description !== undefined ? description : existing.description,
          isActive: isActive !== undefined ? isActive : existing.isActive,
        } : {}),
        // Both SUPER_ADMIN and ROUTE_ADMIN can update settings
        operatorSharePercent: operatorSharePercent !== undefined ? operatorSharePercent : existing.operatorSharePercent,
        driverSharePercent: driverSharePercent !== undefined ? driverSharePercent : existing.driverSharePercent,
        weekdayMinimumCollection: weekdayMinimumCollection !== undefined ? (weekdayMinimumCollection || null) : existing.weekdayMinimumCollection,
        sundayMinimumCollection: sundayMinimumCollection !== undefined ? (sundayMinimumCollection || null) : existing.sundayMinimumCollection,
        defaultCoopContribution: defaultCoopContribution !== undefined ? (defaultCoopContribution || null) : existing.defaultCoopContribution,
        driverBasePay: driverBasePay !== undefined ? (driverBasePay || null) : existing.driverBasePay,
        suspensionThreshold: suspensionThreshold !== undefined ? (suspensionThreshold || null) : existing.suspensionThreshold,
      },
    })

    return NextResponse.json({ success: true, data: route })
  } catch (error) {
    console.error('Error updating route:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update route' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only SUPER_ADMIN can delete routes
    if (!(await isSuperAdmin())) {
      return NextResponse.json(
        { success: false, error: 'Super Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Soft delete - set isActive to false
    const route = await prisma.route.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: route })
  } catch (error) {
    console.error('Error deleting route:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete route' },
      { status: 500 }
    )
  }
}
