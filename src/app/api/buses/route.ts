import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeOperator = searchParams.get('includeOperator') === 'true'
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const buses = await prisma.bus.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        operator: includeOperator,
      },
      orderBy: { busNumber: 'asc' },
    })

    return NextResponse.json({ success: true, data: buses })
  } catch (error) {
    console.error('Error fetching buses:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch buses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { busNumber, plateNumber, model, capacity, operatorId } = body

    if (!busNumber) {
      return NextResponse.json(
        { success: false, error: 'Bus number is required' },
        { status: 400 }
      )
    }

    const bus = await prisma.bus.create({
      data: {
        busNumber,
        plateNumber: plateNumber || null,
        model: model || null,
        capacity: capacity ? parseInt(capacity) : null,
        operatorId: operatorId || null,
      },
      include: { operator: true },
    })

    return NextResponse.json({ success: true, data: bus }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating bus:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Bus number or plate number already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create bus' },
      { status: 500 }
    )
  }
}
