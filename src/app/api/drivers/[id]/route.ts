import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
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
    const { id } = await params
    const body = await request.json()
    const { name, licenseNumber, contactNumber, address, sharePercent, isActive } = body

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        name,
        licenseNumber: licenseNumber || null,
        contactNumber: contactNumber || null,
        address: address || null,
        sharePercent: sharePercent !== undefined ? parseFloat(sharePercent) : undefined,
        isActive: isActive !== undefined ? isActive : true,
      },
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
    const { id } = await params
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
