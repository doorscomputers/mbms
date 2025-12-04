import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const busId = searchParams.get('busId')
    const operatorId = searchParams.get('operatorId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const dailyWhere: {
      busId?: string
      bus?: { operatorId: string }
      date?: { gte?: Date; lte?: Date }
    } = {}

    if (busId) dailyWhere.busId = busId
    if (operatorId) dailyWhere.bus = { operatorId }
    if (startDate || endDate) {
      dailyWhere.date = {}
      if (startDate) dailyWhere.date.gte = new Date(startDate)
      if (endDate) dailyWhere.date.lte = new Date(endDate)
    }

    // Get daily records aggregate
    const dailyAgg = await prisma.dailyRecord.aggregate({
      where: dailyWhere,
      _sum: {
        totalCollection: true,
        dieselCost: true,
        dieselLiters: true,
        coopContribution: true,
        assigneeShare: true,
        driverShare: true,
        otherExpenses: true,
        excessCollection: true,
      },
      _count: true,
      _avg: {
        totalCollection: true,
        dieselCost: true,
      },
    })

    // Get maintenance costs
    const maintenanceWhere: {
      busId?: string
      bus?: { operatorId: string }
      date?: { gte?: Date; lte?: Date }
    } = {}

    if (busId) maintenanceWhere.busId = busId
    if (operatorId) maintenanceWhere.bus = { operatorId }
    if (startDate || endDate) {
      maintenanceWhere.date = {}
      if (startDate) maintenanceWhere.date.gte = new Date(startDate)
      if (endDate) maintenanceWhere.date.lte = new Date(endDate)
    }

    const maintenanceAgg = await prisma.maintenanceRecord.aggregate({
      where: maintenanceWhere,
      _sum: { totalCost: true },
      _count: true,
    })

    // Get spare parts costs
    const partsWhere: {
      busId?: string
      bus?: { operatorId: string }
      purchaseDate?: { gte?: Date; lte?: Date }
    } = {}

    if (busId) partsWhere.busId = busId
    if (operatorId) partsWhere.bus = { operatorId }
    if (startDate || endDate) {
      partsWhere.purchaseDate = {}
      if (startDate) partsWhere.purchaseDate.gte = new Date(startDate)
      if (endDate) partsWhere.purchaseDate.lte = new Date(endDate)
    }

    const partsAgg = await prisma.sparePart.aggregate({
      where: partsWhere,
      _sum: { totalCost: true },
      _count: true,
    })

    // Get bus count
    const busCount = await prisma.bus.count({
      where: {
        isActive: true,
        ...(busId ? { id: busId } : {}),
        ...(operatorId ? { operatorId } : {}),
      },
    })

    // Get driver count
    const driverCount = await prisma.driver.count({
      where: { isActive: true },
    })

    // Calculate totals
    const totalCollection = dailyAgg._sum.totalCollection?.toNumber() || 0
    const totalDieselCost = dailyAgg._sum.dieselCost?.toNumber() || 0
    const totalCoopContribution = dailyAgg._sum.coopContribution?.toNumber() || 0
    const totalAssigneeShare = dailyAgg._sum.assigneeShare?.toNumber() || 0
    const totalDriverShare = dailyAgg._sum.driverShare?.toNumber() || 0
    const totalOtherExpenses = dailyAgg._sum.otherExpenses?.toNumber() || 0
    const totalMaintenanceCost = maintenanceAgg._sum.totalCost?.toNumber() || 0
    const totalPartsCost = partsAgg._sum.totalCost?.toNumber() || 0

    const netIncome =
      totalCollection -
      totalDieselCost -
      totalCoopContribution -
      totalAssigneeShare -
      totalDriverShare -
      totalOtherExpenses

    const summary = {
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'Present',
      },
      counts: {
        buses: busCount,
        drivers: driverCount,
        dailyRecords: dailyAgg._count,
        maintenanceRecords: maintenanceAgg._count,
        spareParts: partsAgg._count,
      },
      collections: {
        total: totalCollection,
        average: dailyAgg._avg.totalCollection?.toNumber() || 0,
        excessTotal: dailyAgg._sum.excessCollection?.toNumber() || 0,
      },
      expenses: {
        diesel: totalDieselCost,
        averageDiesel: dailyAgg._avg.dieselCost?.toNumber() || 0,
        dieselLiters: dailyAgg._sum.dieselLiters?.toNumber() || 0,
        coopContribution: totalCoopContribution,
        maintenance: totalMaintenanceCost,
        spareParts: totalPartsCost,
        other: totalOtherExpenses,
        total:
          totalDieselCost +
          totalCoopContribution +
          totalOtherExpenses +
          totalMaintenanceCost +
          totalPartsCost,
      },
      shares: {
        assignee: totalAssigneeShare,
        driver: totalDriverShare,
        total: totalAssigneeShare + totalDriverShare,
      },
      netIncome,
    }

    return NextResponse.json({ success: true, data: summary })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
