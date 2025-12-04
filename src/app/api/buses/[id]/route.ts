import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bus = await prisma.bus.findUnique({
      where: { id },
      include: {
        operator: true,
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
    const { id } = await params
    const body = await request.json()
    const { busNumber, plateNumber, model, capacity, operatorId, isActive } = body

    const bus = await prisma.bus.update({
      where: { id },
      data: {
        busNumber,
        plateNumber: plateNumber || null,
        model: model || null,
        capacity: capacity ? parseInt(capacity) : null,
        operatorId: operatorId || null,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: { operator: true },
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
    const { id } = await params
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
