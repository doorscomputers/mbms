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

    // Get all daily records grouped by driver
    const driverPerformance = await prisma.driver.findMany({
      where: { isActive: true },
      include: {
        dailyRecords: {
          where: startDate || endDate ? { date: dateFilter } : undefined,
          select: {
            totalCollection: true,
            driverShare: true,
            tripCount: true,
            passengerCount: true,
            dieselLiters: true,
            dieselCost: true,
            date: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Calculate performance metrics for each driver
    const performanceData = driverPerformance.map((driver) => {
      const records = driver.dailyRecords
      const totalDays = records.length
      const totalCollection = records.reduce(
        (sum, r) => sum + (r.totalCollection?.toNumber() || 0),
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

      return {
        driverId: driver.id,
        driverName: driver.name,
        totalDays,
        totalCollection,
        averageCollection: totalDays > 0 ? totalCollection / totalDays : 0,
        totalDriverShare,
        averageDriverShare: totalDays > 0 ? totalDriverShare / totalDays : 0,
        totalTrips,
        averageTripsPerDay: totalDays > 0 ? totalTrips / totalDays : 0,
        totalPassengers,
        averagePassengersPerDay: totalDays > 0 ? totalPassengers / totalDays : 0,
        totalDieselLiters,
        totalDieselCost,
        collectionPerTrip: totalTrips > 0 ? totalCollection / totalTrips : 0,
      }
    })

    // Sort by total collection descending
    performanceData.sort((a, b) => b.totalCollection - a.totalCollection)

    // Add ranking
    const rankedData = performanceData.map((driver, index) => ({
      ...driver,
      rank: index + 1,
    }))

    return NextResponse.json({ success: true, data: rankedData })
  } catch (error) {
    console.error('Error fetching driver performance:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch driver performance' },
      { status: 500 }
    )
  }
}
