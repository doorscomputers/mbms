import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const busId = searchParams.get('busId')
    const partType = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: {
      busId?: string
      partType?: unknown
      purchaseDate?: { gte?: Date; lte?: Date }
    } = {}

    if (busId) where.busId = busId
    if (partType) where.partType = partType
    if (startDate || endDate) {
      where.purchaseDate = {}
      if (startDate) where.purchaseDate.gte = new Date(startDate)
      if (endDate) where.purchaseDate.lte = new Date(endDate)
    }

    const parts = await prisma.sparePart.findMany({
      where,
      include: {
        bus: { include: { operator: true } },
      },
      orderBy: { purchaseDate: 'desc' },
      take: limit,
    })

    return NextResponse.json({ success: true, data: parts })
  } catch (error) {
    console.error('Error fetching spare parts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch spare parts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      busId,
      partName,
      partType,
      brand,
      quantity,
      unitCost,
      purchaseDate,
      installedDate,
      supplier,
      warrantyExpiry,
      notes,
    } = body

    if (!busId || !partName || !partType || !purchaseDate) {
      return NextResponse.json(
        { success: false, error: 'Bus, part name, part type, and purchase date are required' },
        { status: 400 }
      )
    }

    const qty = parseInt(quantity || '1')
    const cost = parseFloat(unitCost || '0')
    const totalCost = qty * cost

    const part = await prisma.sparePart.create({
      data: {
        busId,
        partName,
        partType,
        brand: brand || null,
        quantity: qty,
        unitCost: cost,
        totalCost,
        purchaseDate: new Date(purchaseDate),
        installedDate: installedDate ? new Date(installedDate) : null,
        supplier: supplier || null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        notes: notes || null,
      },
      include: {
        bus: { include: { operator: true } },
      },
    })

    return NextResponse.json({ success: true, data: part }, { status: 201 })
  } catch (error) {
    console.error('Error creating spare part:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create spare part record' },
      { status: 500 }
    )
  }
}
