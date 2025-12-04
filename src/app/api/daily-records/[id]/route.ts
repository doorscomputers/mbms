import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { calculateShares } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await prisma.dailyRecord.findUnique({
      where: { id },
      include: {
        bus: { include: { operator: true } },
        driver: true,
      },
    })

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
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
    const { id } = await params
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

    const assigneeSharePercent = bus.operator?.sharePercent?.toNumber() || 0
    const driverSharePercent = driver.sharePercent?.toNumber() || 0

    // Recalculate shares
    const computation = calculateShares(
      parseFloat(totalCollection || '0'),
      parseFloat(dieselCost || '0'),
      parseFloat(coopContribution || '0'),
      parseFloat(otherExpenses || '0'),
      parseFloat(minimumCollection || '6500'),
      assigneeSharePercent,
      driverSharePercent
    )

    const record = await prisma.dailyRecord.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        busId,
        driverId,
        totalCollection: parseFloat(totalCollection || '0'),
        passengerCount: parseInt(passengerCount || '0'),
        tripCount: parseInt(tripCount || '0'),
        dieselLiters: parseFloat(dieselLiters || '0'),
        dieselCost: parseFloat(dieselCost || '0'),
        odometerStart: parseFloat(odometerStart || '0'),
        odometerEnd: parseFloat(odometerEnd || '0'),
        minimumCollection: parseFloat(minimumCollection || '6500'),
        coopContribution: parseFloat(coopContribution || '0'),
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
    const { id } = await params
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
