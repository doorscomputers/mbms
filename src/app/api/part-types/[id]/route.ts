import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const partType = await prisma.partTypeConfig.findUnique({
      where: { id },
    })

    if (!partType) {
      return NextResponse.json(
        { success: false, error: 'Part type not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: partType })
  } catch (error) {
    console.error('Error fetching part type:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch part type' },
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
    const { code, label, description, isActive, sortOrder } = body

    // Check if part type exists
    const existing = await prisma.partTypeConfig.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Part type not found' },
        { status: 404 }
      )
    }

    // If code is being changed, check for duplicates
    if (code && code !== existing.code) {
      const normalizedCode = code
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '')

      const duplicate = await prisma.partTypeConfig.findUnique({
        where: { code: normalizedCode },
      })

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Part type with this code already exists' },
          { status: 400 }
        )
      }
    }

    const partType = await prisma.partTypeConfig.update({
      where: { id },
      data: {
        ...(code && {
          code: code.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''),
        }),
        ...(label && { label: label.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json({ success: true, data: partType })
  } catch (error) {
    console.error('Error updating part type:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update part type' },
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

    // Check if any spare parts use this type
    const partType = await prisma.partTypeConfig.findUnique({
      where: { id },
    })

    if (!partType) {
      return NextResponse.json(
        { success: false, error: 'Part type not found' },
        { status: 404 }
      )
    }

    const usageCount = await prisma.sparePart.count({
      where: { partType: partType.code },
    })

    if (usageCount > 0) {
      // Soft delete by marking as inactive
      await prisma.partTypeConfig.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        message: `Part type deactivated (used by ${usageCount} spare parts)`,
      })
    }

    // Hard delete if not used
    await prisma.partTypeConfig.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Part type deleted' })
  } catch (error) {
    console.error('Error deleting part type:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete part type' },
      { status: 500 }
    )
  }
}
