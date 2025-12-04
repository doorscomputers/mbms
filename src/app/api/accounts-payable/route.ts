import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const busId = searchParams.get('busId')
    const category = searchParams.get('category')
    const isPaid = searchParams.get('isPaid')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: {
      busId?: string
      category?: unknown
      isPaid?: boolean
    } = {}

    if (busId) where.busId = busId
    if (category) where.category = category
    if (isPaid !== null && isPaid !== undefined) {
      where.isPaid = isPaid === 'true'
    }

    const records = await prisma.accountsPayable.findMany({
      where,
      include: {
        bus: { include: { operator: true } },
        maintenance: true,
        sparePart: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching accounts payable:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts payable' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      busId,
      category,
      description,
      amount,
      dueDate,
      supplier,
      invoiceNumber,
      notes,
      maintenanceId,
      sparePartId,
    } = body

    if (!busId || !category || !description || !amount) {
      return NextResponse.json(
        { success: false, error: 'Bus, category, description, and amount are required' },
        { status: 400 }
      )
    }

    const record = await prisma.accountsPayable.create({
      data: {
        busId,
        category,
        description,
        amount: parseFloat(amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        supplier: supplier || null,
        invoiceNumber: invoiceNumber || null,
        notes: notes || null,
        maintenanceId: maintenanceId || null,
        sparePartId: sparePartId || null,
      },
      include: {
        bus: { include: { operator: true } },
        maintenance: true,
        sparePart: true,
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating accounts payable:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create accounts payable record' },
      { status: 500 }
    )
  }
}
