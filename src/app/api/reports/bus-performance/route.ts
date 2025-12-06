import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause for date filtering
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    // Get all buses with their daily records and maintenance
    const buses = await prisma.bus.findMany({
      where: { isActive: true },
      include: {
        operator: {
          select: { name: true },
        },
        dailyRecords: {
          where: startDate || endDate ? { date: dateFilter } : undefined,
          select: {
            totalCollection: true,
            assigneeShare: true,
            driverShare: true,
            tripCount: true,
            passengerCount: true,
            dieselLiters: true,
            dieselCost: true,
            odometerStart: true,
            odometerEnd: true,
            coopContribution: true,
            otherExpenses: true,
            date: true,
          },
        },
        maintenanceRecords: {
          where: startDate || endDate ? { date: dateFilter } : undefined,
          select: {
            totalCost: true,
          },
        },
      },
      orderBy: { busNumber: 'asc' },
    })

    // Calculate performance metrics for each bus
    const busPerformance = buses.map((bus) => {
      const records = bus.dailyRecords
      const maintenance = bus.maintenanceRecords

      const totalDays = records.length
      const totalCollection = records.reduce(
        (sum, r) => sum + (r.totalCollection?.toNumber() || 0),
        0
      )
      const totalAssigneeShare = records.reduce(
        (sum, r) => sum + (r.assigneeShare?.toNumber() || 0),
        0
      )
      const totalDriverShare = records.reduce(
        (sum, r) => sum + (r.driverShare?.toNumber() || 0),
        0
      )
      const totalTrips = records.reduce((sum, r) => sum + (r.tripCount || 0), 0)
      const totalPassengers = records.reduce(
        (sum, r) => sum + (r.passengerCount || 0),
        0
      )
      const totalDieselLiters = records.reduce(
        (sum, r) => sum + (r.dieselLiters?.toNumber() || 0),
        0
      )
      const totalDieselCost = records.reduce(
        (sum, r) => sum + (r.dieselCost?.toNumber() || 0),
        0
      )
      const totalCoopContribution = records.reduce(
        (sum, r) => sum + (r.coopContribution?.toNumber() || 0),
        0
      )
      const totalOtherExpenses = records.reduce(
        (sum, r) => sum + (r.otherExpenses?.toNumber() || 0),
        0
      )
      const totalMaintenanceCost = maintenance.reduce(
        (sum, m) => sum + (m.totalCost?.toNumber() || 0),
        0
      )

      // Calculate total distance
      let totalDistance = 0
      records.forEach((r) => {
        const start = r.odometerStart?.toNumber() || 0
        const end = r.odometerEnd?.toNumber() || 0
        if (end > start) {
          totalDistance += end - start
        }
      })

      // Calculate profitability
      const totalExpenses = totalDieselCost + totalCoopContribution + totalOtherExpenses + totalMaintenanceCost
      const netIncome = totalCollection - totalExpenses - totalAssigneeShare - totalDriverShare

      return {
        busId: bus.id,
        busNumber: bus.busNumber,
        plateNumber: bus.plateNumber,
        operatorName: bus.operator?.name || 'N/A',
        totalDays,
        totalCollection,
        averageCollection: totalDays > 0 ? totalCollection / totalDays : 0,
        totalAssigneeShare,
        totalDriverShare,
        totalTrips,
        averageTripsPerDay: totalDays > 0 ? totalTrips / totalDays : 0,
        totalPassengers,
        averagePassengersPerDay: totalDays > 0 ? totalPassengers / totalDays : 0,
        totalDieselLiters,
        totalDieselCost,
        totalDistance,
        kmPerLiter: totalDieselLiters > 0 ? totalDistance / totalDieselLiters : 0,
        totalMaintenanceCost,
        totalExpenses,
        netIncome,
        profitMargin: totalCollection > 0 ? (netIncome / totalCollection) * 100 : 0,
        collectionPerKm: totalDistance > 0 ? totalCollection / totalDistance : 0,
      }
    })

    // Sort by total collection descending
    busPerformance.sort((a, b) => b.totalCollection - a.totalCollection)

    // Add ranking
    const rankedData = busPerformance.map((bus, index) => ({
      ...bus,
      rank: index + 1,
    }))

    // Top performers summary
    const topByCollection = [...rankedData].slice(0, 5)
    const topByEfficiency = [...rankedData]
      .filter((b) => b.kmPerLiter > 0)
      .sort((a, b) => b.kmPerLiter - a.kmPerLiter)
      .slice(0, 5)
    const topByProfit = [...rankedData]
      .sort((a, b) => b.netIncome - a.netIncome)
      .slice(0, 5)

    return NextResponse.json({
      success: true,
      data: {
        buses: rankedData,
        topPerformers: {
          byCollection: topByCollection,
          byEfficiency: topByEfficiency,
          byProfit: topByProfit,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching bus performance:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bus performance' },
      { status: 500 }
    )
  }
}
