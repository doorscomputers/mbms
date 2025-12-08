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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const record = await prisma.dailyRecord.findUnique({
      where: { id },
      include: {
        bus: { include: { operator: { include: { route: true } } } },
        driver: true,
      },
    })

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only view records in their route
    if (currentUser.role === 'ROUTE_ADMIN' && record.bus?.operator?.routeId !== currentUser.routeId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // OPERATOR can only view their own records
    if (currentUser.role === 'OPERATOR' && record.bus?.operatorId !== currentUser.operatorId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error fetching daily record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily record' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
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

    // Check existing record
    const existing = await prisma.dailyRecord.findUnique({
      where: { id },
      include: { bus: { include: { operator: true } } },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only update records in their route
    if (currentUser.role === 'ROUTE_ADMIN' && existing.bus?.operator?.routeId !== currentUser.routeId) {
      return NextResponse.json(
        { success: false, error: 'You can only update records in your route' },
        { status: 403 }
      )
    }

    // OPERATOR can only update their own records
    if (currentUser.role === 'OPERATOR' && existing.bus?.operatorId !== currentUser.operatorId) {
      return NextResponse.json(
        { success: false, error: 'You can only update your own records' },
        { status: 403 }
      )
    }

    // Verify bus and driver exist
    const bus = await withRetry(() => prisma.bus.findUnique({
      where: { id: busId },
      include: { operator: true },
    }))
    const driver = await withRetry(() => prisma.driver.findUnique({ where: { id: driverId } }))

    if (!bus || !driver) {
      return NextResponse.json(
        { success: false, error: 'Bus or driver not found' },
        { status: 404 }
      )
    }

    // Get settings and calculate shares server-side
    const settings = await getSettings()
    const recordDate = date ? new Date(date) : existing.date
    const collection = parseFloat(totalCollection || '0')
    const diesel = parseFloat(dieselCost || '0')
    const coop = parseFloat(coopContribution || '0')
    const other = parseFloat(otherExpenses || '0')
    const driverShareInput = parseFloat(driverShare || '0')

    // Server-side calculation ensures correct values
    const computed = computeShares(collection, diesel, coop, other, driverShareInput, recordDate, settings)

    const record = await withRetry(() => prisma.dailyRecord.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        busId,
        driverId,
        totalCollection: collection,
        dieselCost: diesel,
        driverShare: computed.driverShare,
        coopContribution: coop,
        otherExpenses: other,
        assigneeShare: computed.assigneeShare,
        notes: notes || null,
      },
      include: {
        bus: { include: { operator: { include: { route: true } } } },
        driver: true,
      },
    }))

    return NextResponse.json({ success: true, data: record })
  } catch (error: unknown) {
    console.error('Error updating daily record:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update daily record' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check existing record
    const existing = await prisma.dailyRecord.findUnique({
      where: { id },
      include: { bus: { include: { operator: true } } },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }

    // ROUTE_ADMIN can only delete records in their route
    if (currentUser.role === 'ROUTE_ADMIN' && existing.bus?.operator?.routeId !== currentUser.routeId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete records in your route' },
        { status: 403 }
      )
    }

    // OPERATOR can only delete their own records
    if (currentUser.role === 'OPERATOR' && existing.bus?.operatorId !== currentUser.operatorId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own records' },
        { status: 403 }
      )
    }

    await prisma.dailyRecord.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Record deleted' })
  } catch (error: unknown) {
    console.error('Error deleting daily record:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete daily record' },
      { status: 500 }
    )
  }
}
