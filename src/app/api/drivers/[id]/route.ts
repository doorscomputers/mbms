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
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        route: true,
        dailyRecords: {
          orderBy: { date: 'desc' },
          take: 30,
          include: { bus: true },
        },
      },
    })

    if (!driver) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only view drivers in their route
    if (currentUser.role === 'ROUTE_ADMIN' && driver.routeId !== currentUser.routeId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, data: driver })
  } catch (error) {
    console.error('Error fetching driver:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch driver' },
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

    // Only SUPER_ADMIN and ROUTE_ADMIN can update drivers
    if (!(await canManageRoute())) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, licenseNumber, contactNumber, address, sharePercent, isActive, routeId } = body

    // Check existing driver
    const existing = await prisma.driver.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only update drivers in their route
    if (currentUser?.role === 'ROUTE_ADMIN') {
      if (existing.routeId !== currentUser.routeId) {
        return NextResponse.json(
          { success: false, error: 'You can only update drivers in your route' },
          { status: 403 }
        )
      }
      // ROUTE_ADMIN cannot change the routeId
      if (routeId && routeId !== currentUser.routeId) {
        return NextResponse.json(
          { success: false, error: 'You cannot move drivers to another route' },
          { status: 403 }
        )
      }
    }

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        name,
        licenseNumber: licenseNumber || null,
        contactNumber: contactNumber || null,
        address: address || null,
        sharePercent: sharePercent !== undefined ? parseFloat(sharePercent) : undefined,
        isActive: isActive !== undefined ? isActive : true,
        ...(currentUser?.role === 'SUPER_ADMIN' && routeId !== undefined ? { routeId: routeId || null } : {}),
      },
      include: { route: true },
    })

    return NextResponse.json({ success: true, data: driver })
  } catch (error: unknown) {
    console.error('Error updating driver:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update driver' },
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

    // Only SUPER_ADMIN and ROUTE_ADMIN can delete drivers
    if (!(await canManageRoute())) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check existing driver
    const existing = await prisma.driver.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only delete drivers in their route
    if (currentUser?.role === 'ROUTE_ADMIN' && existing.routeId !== currentUser.routeId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete drivers in your route' },
        { status: 403 }
      )
    }

    const driver = await prisma.driver.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: driver })
  } catch (error: unknown) {
    console.error('Error deleting driver:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Driver not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete driver' },
      { status: 500 }
    )
  }
}
