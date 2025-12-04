import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const part = await prisma.sparePart.findUnique({
      where: { id },
      include: {
        bus: { include: { operator: true } },
      },
    })

    if (!part) {
      return NextResponse.json(
        { success: false, error: 'Spare part not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: part })
  } catch (error) {
    console.error('Error fetching spare part:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch spare part' },
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

    const qty = parseInt(quantity || '1')
    const cost = parseFloat(unitCost || '0')
    const totalCost = qty * cost

    const part = await prisma.sparePart.update({
      where: { id },
      data: {
        busId,
        partName,
        partType,
        brand: brand || null,
        quantity: qty,
        unitCost: cost,
        totalCost,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        installedDate: installedDate ? new Date(installedDate) : null,
        supplier: supplier || null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        notes: notes || null,
      },
      include: {
        bus: { include: { operator: true } },
      },
    })

    return NextResponse.json({ success: true, data: part })
  } catch (error: unknown) {
    console.error('Error updating spare part:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Spare part not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update spare part' },
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
    await prisma.sparePart.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Spare part deleted' })
  } catch (error: unknown) {
    console.error('Error deleting spare part:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Spare part not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete spare part' },
      { status: 500 }
    )
  }
}
