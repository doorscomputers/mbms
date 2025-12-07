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
    const operator = await prisma.operator.findUnique({
      where: { id },
      include: {
        route: true,
        buses: {
          where: { isActive: true },
          include: {
            defaultDriver: true,
            maintenanceRecords: {
              orderBy: { date: 'desc' },
              take: 5,
            },
            spareParts: {
              orderBy: { purchaseDate: 'desc' },
              take: 5,
            },
          },
          orderBy: { busNumber: 'asc' },
        },
      },
    })

    if (!operator) {
      return NextResponse.json(
        { success: false, error: 'Operator not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only view operators in their route
    if (currentUser.role === 'ROUTE_ADMIN' && operator.routeId !== currentUser.routeId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // OPERATOR can only view their own operator record
    if (currentUser.role === 'OPERATOR' && operator.id !== currentUser.operatorId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, data: operator })
  } catch (error) {
    console.error('Error fetching operator:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch operator' },
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

    // Only SUPER_ADMIN and ROUTE_ADMIN can update operators
    if (!(await canManageRoute())) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, contactNumber, address, sharePercent, isActive, routeId } = body

    // Check existing operator
    const existing = await prisma.operator.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Operator not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only update operators in their route
    if (currentUser?.role === 'ROUTE_ADMIN') {
      if (existing.routeId !== currentUser.routeId) {
        return NextResponse.json(
          { success: false, error: 'You can only update operators in your route' },
          { status: 403 }
        )
      }
      // ROUTE_ADMIN cannot change the routeId
      if (routeId && routeId !== currentUser.routeId) {
        return NextResponse.json(
          { success: false, error: 'You cannot move operators to another route' },
          { status: 403 }
        )
      }
    }

    const operator = await prisma.operator.update({
      where: { id },
      data: {
        name,
        contactNumber: contactNumber || null,
        address: address || null,
        sharePercent: sharePercent !== undefined ? parseFloat(sharePercent) : undefined,
        isActive: isActive !== undefined ? isActive : true,
        ...(currentUser?.role === 'SUPER_ADMIN' && routeId !== undefined ? { routeId: routeId || null } : {}),
      },
      include: { route: true },
    })

    return NextResponse.json({ success: true, data: operator })
  } catch (error: unknown) {
    console.error('Error updating operator:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Operator not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update operator' },
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

    // Only SUPER_ADMIN and ROUTE_ADMIN can delete operators
    if (!(await canManageRoute())) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check existing operator
    const existing = await prisma.operator.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Operator not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only delete operators in their route
    if (currentUser?.role === 'ROUTE_ADMIN' && existing.routeId !== currentUser.routeId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete operators in your route' },
        { status: 403 }
      )
    }

    const operator = await prisma.operator.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: operator })
  } catch (error: unknown) {
    console.error('Error deleting operator:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Operator not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete operator' },
      { status: 500 }
    )
  }
}
