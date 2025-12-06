import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, canManageRoute } from '@/lib/auth-utils'

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
    const bus = await prisma.bus.findUnique({
      where: { id },
      include: {
        operator: { include: { route: true } },
        defaultDriver: true,
        maintenanceRecords: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        spareParts: {
          orderBy: { purchaseDate: 'desc' },
          take: 10,
        },
      },
    })

    if (!bus) {
      return NextResponse.json(
        { success: false, error: 'Bus not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only view buses in their route
    if (currentUser.role === 'ROUTE_ADMIN' && bus.operator?.routeId !== currentUser.routeId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // OPERATOR can only view their own buses
    if (currentUser.role === 'OPERATOR' && bus.operatorId !== currentUser.operatorId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, data: bus })
  } catch (error) {
    console.error('Error fetching bus:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bus' },
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

    // Only SUPER_ADMIN and ROUTE_ADMIN can update buses
    if (!(await canManageRoute())) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { busNumber, plateNumber, model, capacity, operatorId, defaultDriverId, isActive } = body

    // Check existing bus
    const existing = await prisma.bus.findUnique({
      where: { id },
      include: { operator: true },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Bus not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only update buses in their route
    if (currentUser?.role === 'ROUTE_ADMIN') {
      if (existing.operator?.routeId !== currentUser.routeId) {
        return NextResponse.json(
          { success: false, error: 'You can only update buses in your route' },
          { status: 403 }
        )
      }
      // Validate new operatorId if changing
      if (operatorId && operatorId !== existing.operatorId) {
        const newOperator = await prisma.operator.findUnique({ where: { id: operatorId } })
        if (!newOperator || newOperator.routeId !== currentUser.routeId) {
          return NextResponse.json(
            { success: false, error: 'You can only assign buses to operators in your route' },
            { status: 403 }
          )
        }
      }
    }

    const bus = await prisma.bus.update({
      where: { id },
      data: {
        busNumber,
        plateNumber: plateNumber || null,
        model: model || null,
        capacity: capacity ? parseInt(capacity) : null,
        operatorId: operatorId || null,
        defaultDriverId: defaultDriverId || null,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: { operator: { include: { route: true } }, defaultDriver: true },
    })

    return NextResponse.json({ success: true, data: bus })
  } catch (error: unknown) {
    console.error('Error updating bus:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Bus not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update bus' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    // Only SUPER_ADMIN and ROUTE_ADMIN can delete buses
    if (!(await canManageRoute())) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check existing bus
    const existing = await prisma.bus.findUnique({
      where: { id },
      include: { operator: true },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Bus not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only delete buses in their route
    if (currentUser?.role === 'ROUTE_ADMIN' && existing.operator?.routeId !== currentUser.routeId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete buses in your route' },
        { status: 403 }
      )
    }

    // Soft delete - just mark as inactive
    const bus = await prisma.bus.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: bus })
  } catch (error: unknown) {
    console.error('Error deleting bus:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Bus not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete bus' },
      { status: 500 }
    )
  }
}
