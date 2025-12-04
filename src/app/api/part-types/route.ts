import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Default part types for initial seeding
const DEFAULT_PART_TYPES = [
  { code: 'TIRE', label: 'Tire', sortOrder: 1 },
  { code: 'BATTERY', label: 'Battery', sortOrder: 2 },
  { code: 'BRAKE_PAD', label: 'Brake Pad', sortOrder: 3 },
  { code: 'BRAKE_DISC', label: 'Brake Disc', sortOrder: 4 },
  { code: 'OIL_FILTER', label: 'Oil Filter', sortOrder: 5 },
  { code: 'AIR_FILTER', label: 'Air Filter', sortOrder: 6 },
  { code: 'FUEL_FILTER', label: 'Fuel Filter', sortOrder: 7 },
  { code: 'SPARK_PLUG', label: 'Spark Plug', sortOrder: 8 },
  { code: 'BELT', label: 'Belt', sortOrder: 9 },
  { code: 'HOSE', label: 'Hose', sortOrder: 10 },
  { code: 'LIGHT_BULB', label: 'Light Bulb', sortOrder: 11 },
  { code: 'WIPER', label: 'Wiper', sortOrder: 12 },
  { code: 'MIRROR', label: 'Mirror', sortOrder: 13 },
  { code: 'SEAT', label: 'Seat', sortOrder: 14 },
  { code: 'ENGINE_PART', label: 'Engine Part', sortOrder: 15 },
  { code: 'TRANSMISSION_PART', label: 'Transmission Part', sortOrder: 16 },
  { code: 'SUSPENSION', label: 'Suspension', sortOrder: 17 },
  { code: 'WATER_PUMP', label: 'Water Pump', sortOrder: 18 },
  { code: 'OTHER', label: 'Other', sortOrder: 99 },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const seedIfEmpty = searchParams.get('seedIfEmpty') === 'true'

    // Check if we have any part types
    let partTypes = await prisma.partTypeConfig.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    })

    // Seed default part types if empty and requested
    if (partTypes.length === 0 && seedIfEmpty) {
      await prisma.partTypeConfig.createMany({
        data: DEFAULT_PART_TYPES,
        skipDuplicates: true,
      })
      partTypes = await prisma.partTypeConfig.findMany({
        where: activeOnly ? { isActive: true } : undefined,
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      })
    }

    return NextResponse.json({ success: true, data: partTypes })
  } catch (error) {
    console.error('Error fetching part types:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch part types' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, label, description, sortOrder } = body

    if (!code || !label) {
      return NextResponse.json(
        { success: false, error: 'Code and label are required' },
        { status: 400 }
      )
    }

    // Normalize code to uppercase and replace spaces with underscores
    const normalizedCode = code
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')

    // Check for duplicate code
    const existing = await prisma.partTypeConfig.findUnique({
      where: { code: normalizedCode },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Part type with this code already exists' },
        { status: 400 }
      )
    }

    // Get max sort order if not provided
    let newSortOrder = sortOrder
    if (newSortOrder === undefined || newSortOrder === null) {
      const maxOrder = await prisma.partTypeConfig.aggregate({
        _max: { sortOrder: true },
      })
      newSortOrder = (maxOrder._max.sortOrder || 0) + 1
    }

    const partType = await prisma.partTypeConfig.create({
      data: {
        code: normalizedCode,
        label: label.trim(),
        description: description?.trim() || null,
        sortOrder: newSortOrder,
      },
    })

    return NextResponse.json({ success: true, data: partType }, { status: 201 })
  } catch (error) {
    console.error('Error creating part type:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create part type' },
      { status: 500 }
    )
  }
}
