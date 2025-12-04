import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const includeBuses = searchParams.get('includeBuses') === 'true'

    const operators = await prisma.operator.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: includeBuses ? { buses: { where: { isActive: true } } } : undefined,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: operators })
  } catch (error) {
    console.error('Error fetching operators:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch operators' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, contactNumber, address, sharePercent } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Operator name is required' },
        { status: 400 }
      )
    }

    const operator = await prisma.operator.create({
      data: {
        name,
        contactNumber: contactNumber || null,
        address: address || null,
        sharePercent: sharePercent ? parseFloat(sharePercent) : 0,
      },
    })

    return NextResponse.json({ success: true, data: operator }, { status: 201 })
  } catch (error) {
    console.error('Error creating operator:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create operator' },
      { status: 500 }
    )
  }
}
