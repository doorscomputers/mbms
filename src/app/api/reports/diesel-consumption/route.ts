import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const busId = searchParams.get('busId')

    // Build where clause
    const whereClause: {
      date?: { gte?: Date; lte?: Date }
      busId?: string
    } = {}

    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) whereClause.date.gte = new Date(startDate)
      if (endDate) whereClause.date.lte = new Date(endDate)
    }
    if (busId && busId !== 'all') {
      whereClause.busId = busId
    }

    // Get diesel consumption grouped by bus
    const buses = await prisma.bus.findMany({
      where: { isActive: true },
      include: {
        dailyRecords: {
          where: whereClause.date ? { date: whereClause.date } : undefined,
          select: {
            dieselLiters: true,
            dieselCost: true,
            date: true,
            odometerStart: true,
            odometerEnd: true,
            totalCollection: true,
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { busNumber: 'asc' },
    })

    // Calculate diesel metrics per bus
    const dieselByBus = buses.map((bus) => {
      const records = bus.dailyRecords
      const totalLiters = records.reduce(
        (sum, r) => sum + (r.dieselLiters?.toNumber() || 0),
        0
      )
      const totalCost = records.reduce(
        (sum, r) => sum + (r.dieselCost?.toNumber() || 0),
        0
      )
      const totalCollection = records.reduce(
        (sum, r) => sum + (r.totalCollection?.toNumber() || 0),
        0
      )

      // Calculate total distance traveled
      let totalDistance = 0
      records.forEach((r) => {
        const start = r.odometerStart?.toNumber() || 0
        const end = r.odometerEnd?.toNumber() || 0
        if (end > start) {
          totalDistance += end - start
        }
      })

      const recordCount = records.length
      const kmPerLiter = totalLiters > 0 ? totalDistance / totalLiters : 0
      const costPerKm = totalDistance > 0 ? totalCost / totalDistance : 0
      const averageLitersPerDay = recordCount > 0 ? totalLiters / recordCount : 0
      const averageCostPerDay = recordCount > 0 ? totalCost / recordCount : 0

      return {
        busId: bus.id,
        busNumber: bus.busNumber,
        plateNumber: bus.plateNumber,
        totalRecords: recordCount,
        totalDieselLiters: totalLiters,
        totalDieselCost: totalCost,
        totalCollection,
        totalDistance,
        kmPerLiter,
        costPerKm,
        averageLitersPerDay,
        averageCostPerDay,
        dieselCostPercentage: totalCollection > 0 ? (totalCost / totalCollection) * 100 : 0,
      }
    })

    // Get daily diesel data for chart (all buses combined or specific bus)
    const dailyDieselQuery = await prisma.dailyRecord.groupBy({
      by: ['date'],
      where: whereClause,
      _sum: {
        dieselLiters: true,
        dieselCost: true,
      },
      orderBy: { date: 'asc' },
    })

    const dailyDieselChart = dailyDieselQuery.map((day) => ({
      date: day.date.toISOString().split('T')[0],
      totalLiters: day._sum.dieselLiters?.toNumber() || 0,
      totalCost: day._sum.dieselCost?.toNumber() || 0,
    }))

    // Get diesel per bus for chart visualization
    const dieselPerBusChart = dieselByBus
      .filter((b) => b.totalDieselLiters > 0)
      .map((bus) => ({
        busNumber: `Bus #${bus.busNumber}`,
        totalLiters: bus.totalDieselLiters,
        totalCost: bus.totalDieselCost,
        kmPerLiter: bus.kmPerLiter,
      }))

    // Calculate totals
    const totals = {
      totalLiters: dieselByBus.reduce((sum, b) => sum + b.totalDieselLiters, 0),
      totalCost: dieselByBus.reduce((sum, b) => sum + b.totalDieselCost, 0),
      totalDistance: dieselByBus.reduce((sum, b) => sum + b.totalDistance, 0),
      totalRecords: dieselByBus.reduce((sum, b) => sum + b.totalRecords, 0),
    }

    const overallKmPerLiter = totals.totalLiters > 0 ? totals.totalDistance / totals.totalLiters : 0
    const averageCostPerLiter = totals.totalLiters > 0 ? totals.totalCost / totals.totalLiters : 0

    return NextResponse.json({
      success: true,
      data: {
        byBus: dieselByBus,
        dailyChart: dailyDieselChart,
        busChart: dieselPerBusChart,
        totals: {
          ...totals,
          overallKmPerLiter,
          averageCostPerLiter,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching diesel consumption:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch diesel consumption' },
      { status: 500 }
    )
  }
}
