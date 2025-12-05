import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { calculateShares, isSunday, SETTINGS_KEYS, DEFAULT_SETTINGS } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const busId = searchParams.get('busId')
    const driverId = searchParams.get('driverId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: {
      busId?: string
      driverId?: string
      date?: { gte?: Date; lte?: Date }
    } = {}

    if (busId) where.busId = busId
    if (driverId) where.driverId = driverId
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const records = await prisma.dailyRecord.findMany({
      where,
      include: {
        bus: { include: { operator: true } },
        driver: true,
      },
      orderBy: { date: 'desc' },
      take: limit,
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching daily records:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily records' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      date,
      busId,
      driverId,
      totalCollection,
      passengerCount,
      tripCount,
      dieselLiters,
      dieselCost,
      odometerStart,
      odometerEnd,
      minimumCollection,
      coopContribution,
      otherExpenses,
      expenseNotes,
      notes,
    } = body

    if (!date || !busId || !driverId) {
      return NextResponse.json(
        { success: false, error: 'Date, bus, and driver are required' },
        { status: 400 }
      )
    }

    // Get operator and driver share percentages
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: { operator: true },
    })
    const driver = await prisma.driver.findUnique({ where: { id: driverId } })

    if (!bus || !driver) {
      return NextResponse.json(
        { success: false, error: 'Bus or driver not found' },
        { status: 404 }
      )
    }

    // Get settings from database
    const settingsRecords = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            SETTINGS_KEYS.WEEKDAY_MINIMUM_COLLECTION,
            SETTINGS_KEYS.SUNDAY_MINIMUM_COLLECTION,
            SETTINGS_KEYS.DEFAULT_COOP_CONTRIBUTION,
            SETTINGS_KEYS.DRIVER_BASE_PAY,
            SETTINGS_KEYS.DEFAULT_DRIVER_SHARE_PERCENT,
            SETTINGS_KEYS.DEFAULT_ASSIGNEE_SHARE_PERCENT,
          ]
        }
      }
    })

    const settings: Record<string, string> = {}
    settingsRecords.forEach(s => { settings[s.key] = s.value })

    // Determine if Sunday
    const recordDate = new Date(date)
    const sunday = isSunday(recordDate)

    // Get settings values with defaults
    const weekdayMin = parseFloat(settings[SETTINGS_KEYS.WEEKDAY_MINIMUM_COLLECTION] || DEFAULT_SETTINGS[SETTINGS_KEYS.WEEKDAY_MINIMUM_COLLECTION])
    const sundayMin = parseFloat(settings[SETTINGS_KEYS.SUNDAY_MINIMUM_COLLECTION] || DEFAULT_SETTINGS[SETTINGS_KEYS.SUNDAY_MINIMUM_COLLECTION])
    const driverBasePay = parseFloat(settings[SETTINGS_KEYS.DRIVER_BASE_PAY] || DEFAULT_SETTINGS[SETTINGS_KEYS.DRIVER_BASE_PAY])
    const defaultCoop = parseFloat(settings[SETTINGS_KEYS.DEFAULT_COOP_CONTRIBUTION] || DEFAULT_SETTINGS[SETTINGS_KEYS.DEFAULT_COOP_CONTRIBUTION])
    const operatorSharePercent = parseFloat(settings[SETTINGS_KEYS.DEFAULT_ASSIGNEE_SHARE_PERCENT] || DEFAULT_SETTINGS[SETTINGS_KEYS.DEFAULT_ASSIGNEE_SHARE_PERCENT])
    const driverSharePercent = parseFloat(settings[SETTINGS_KEYS.DEFAULT_DRIVER_SHARE_PERCENT] || DEFAULT_SETTINGS[SETTINGS_KEYS.DEFAULT_DRIVER_SHARE_PERCENT])

    // Use appropriate minimum based on day
    const effectiveMinimum = minimumCollection ? parseFloat(minimumCollection) : (sunday ? sundayMin : weekdayMin)

    // Coop is 0 on Sundays, otherwise use provided value or default
    const effectiveCoop = sunday ? 0 : (coopContribution !== undefined ? parseFloat(coopContribution) : defaultCoop)

    // Calculate shares using new formula
    const computation = calculateShares(
      parseFloat(totalCollection || '0'),
      parseFloat(dieselCost || '0'),
      effectiveCoop,
      parseFloat(otherExpenses || '0'),
      effectiveMinimum,
      driverBasePay,
      operatorSharePercent,
      driverSharePercent
    )

    const record = await prisma.dailyRecord.create({
      data: {
        date: new Date(date),
        busId,
        driverId,
        totalCollection: parseFloat(totalCollection || '0'),
        passengerCount: parseInt(passengerCount || '0'),
        tripCount: parseInt(tripCount || '0'),
        dieselLiters: parseFloat(dieselLiters || '0'),
        dieselCost: parseFloat(dieselCost || '0'),
        odometerStart: parseFloat(odometerStart || '0'),
        odometerEnd: parseFloat(odometerEnd || '0'),
        minimumCollection: effectiveMinimum,
        coopContribution: effectiveCoop,
        assigneeShare: computation.assigneeShare,
        driverShare: computation.driverShare,
        excessCollection: computation.excessCollection,
        otherExpenses: parseFloat(otherExpenses || '0'),
        expenseNotes: expenseNotes || null,
        notes: notes || null,
      },
      include: {
        bus: { include: { operator: true } },
        driver: true,
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating daily record:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A record for this bus on this date already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create daily record' },
      { status: 500 }
    )
  }
}
