import { NextRequest, NextResponse } from 'next/server'
import prisma, { withRetry } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { calculateShares } from '@/lib/types'

// Get settings for calculation
async function getSettings() {
  const settings = await withRetry(() => prisma.setting.findMany())
  const settingsMap: Record<string, string> = {}
  settings.forEach((s) => { settingsMap[s.key] = s.value })
  return {
    weekdayMinimum: parseFloat(settingsMap['weekday_minimum_collection'] || '6000'),
    sundayMinimum: parseFloat(settingsMap['sunday_minimum_collection'] || '5000'),
    driverBasePay: parseFloat(settingsMap['driver_base_pay'] || '800'),
  }
}

// Calculate shares based on business rules
function computeShares(
  totalCollection: number,
  dieselCost: number,
  coopContribution: number,
  otherExpenses: number,
  driverShareInput: number,
  date: Date,
  settings: { weekdayMinimum: number; sundayMinimum: number; driverBasePay: number }
) {
  const isSunday = date.getDay() === 0
  const minimum = isSunday ? settings.sundayMinimum : settings.weekdayMinimum

  // Below minimum: use manual driver share, calculate assignee as remainder
  if (totalCollection < minimum && totalCollection > 0) {
    const assigneeShare = totalCollection - dieselCost - coopContribution - otherExpenses - driverShareInput
    return { driverShare: driverShareInput, assigneeShare }
  }

  // Above minimum: use standard formula
  const result = calculateShares(
    totalCollection,
    dieselCost,
    coopContribution,
    otherExpenses,
    minimum,
    settings.driverBasePay,
    60,
    40
  )
  return { driverShare: result.driverShare, assigneeShare: result.assigneeShare }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const busId = searchParams.get('busId')
    const driverId = searchParams.get('driverId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Filter by operator for OPERATOR role
    if (currentUser.role === 'OPERATOR' && currentUser.operatorId) {
      where.bus = { operatorId: currentUser.operatorId }
    }

    // Filter by route for ROUTE_ADMIN (through bus.operator.routeId)
    if (currentUser.role === 'ROUTE_ADMIN' && currentUser.routeId) {
      where.bus = { operator: { routeId: currentUser.routeId } }
    }

    if (busId) where.busId = busId
    if (driverId) where.driverId = driverId
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    // Use withRetry to handle transient database connection failures
    const records = await withRetry(() => prisma.dailyRecord.findMany({
      where,
      include: {
        bus: { include: { operator: { include: { route: true } } } },
        driver: true,
      },
      orderBy: { date: 'desc' },
      take: limit,
    }))

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching daily records:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch daily records'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      date,
      busId,
      driverId,
      totalCollection,
      dieselCost,
      driverShare,
      coopContribution,
      otherExpenses,
      assigneeShare,
      notes,
    } = body

    if (!date || !busId || !driverId) {
      return NextResponse.json(
        { success: false, error: 'Date, bus, and driver are required' },
        { status: 400 }
      )
    }

    // Verify bus and driver exist (with retry for transient failures)
    const [bus, driver] = await withRetry(() => Promise.all([
      prisma.bus.findUnique({
        where: { id: busId },
        include: { operator: true },
      }),
      prisma.driver.findUnique({ where: { id: driverId } })
    ]))

    if (!bus || !driver) {
      return NextResponse.json(
        { success: false, error: 'Bus or driver not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only create records for buses in their route
    if (currentUser.role === 'ROUTE_ADMIN' && bus.operator?.routeId !== currentUser.routeId) {
      return NextResponse.json(
        { success: false, error: 'You can only create records for buses in your route' },
        { status: 403 }
      )
    }

    // OPERATOR can only create records for their own buses
    if (currentUser.role === 'OPERATOR' && bus.operatorId !== currentUser.operatorId) {
      return NextResponse.json(
        { success: false, error: 'You can only create records for your own buses' },
        { status: 403 }
      )
    }

    // Get settings and calculate shares server-side
    const settings = await getSettings()
    const recordDate = new Date(date)
    const collection = parseFloat(totalCollection || '0')
    const diesel = parseFloat(dieselCost || '0')
    const coop = parseFloat(coopContribution || '0')
    const other = parseFloat(otherExpenses || '0')
    const driverShareInput = parseFloat(driverShare || '0')

    // Server-side calculation ensures correct values
    const computed = computeShares(collection, diesel, coop, other, driverShareInput, recordDate, settings)

    const record = await withRetry(() => prisma.dailyRecord.create({
      data: {
        date: recordDate,
        busId,
        driverId,
        totalCollection: collection,
        dieselCost: diesel,
        driverShare: computed.driverShare,
        coopContribution: coop,
        assigneeShare: computed.assigneeShare,
        otherExpenses: other,
        notes: notes || null,
        // Set unused fields to 0
        passengerCount: 0,
        tripCount: 0,
        dieselLiters: 0,
        odometerStart: 0,
        odometerEnd: 0,
        minimumCollection: 0,
        excessCollection: 0,
      },
      include: {
        bus: { include: { operator: { include: { route: true } } } },
        driver: true,
      },
    }))

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
