import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const operator = await prisma.operator.findUnique({
      where: { id },
      include: {
        buses: {
          include: {
            maintenanceRecords: {
              orderBy: { date: 'desc' },
              take: 5,
            },
            spareParts: {
              orderBy: { purchaseDate: 'desc' },
              take: 5,
            },
          },
        },
      },
    })

    if (!operator) {
      return NextResponse.json(
        { success: false, error: 'Operator not found' },
        { status: 404 }
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
    const { id } = await params
    const body = await request.json()
    const { name, contactNumber, address, sharePercent, isActive } = body

    const operator = await prisma.operator.update({
      where: { id },
      data: {
        name,
        contactNumber: contactNumber || null,
        address: address || null,
        sharePercent: sharePercent !== undefined ? parseFloat(sharePercent) : undefined,
        isActive: isActive !== undefined ? isActive : true,
      },
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
    const { id } = await params
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
