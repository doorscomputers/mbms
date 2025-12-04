import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const drivers = await prisma.driver.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    })

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
    const body = await request.json()
    const { name, licenseNumber, contactNumber, address, sharePercent } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Driver name is required' },
        { status: 400 }
      )
    }

    const driver = await prisma.driver.create({
      data: {
        name,
        licenseNumber: licenseNumber || null,
        contactNumber: contactNumber || null,
        address: address || null,
        sharePercent: sharePercent ? parseFloat(sharePercent) : 0,
      },
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
