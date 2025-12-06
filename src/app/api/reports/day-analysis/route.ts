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

    // Get all daily records
    const dailyRecords = await prisma.dailyRecord.findMany({
      where: startDate || endDate ? { date: dateFilter } : undefined,
      select: {
        date: true,
        totalCollection: true,
        tripCount: true,
        passengerCount: true,
        dieselCost: true,
        driverShare: true,
        assigneeShare: true,
      },
    })

    // Group by day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeekData: {
      [key: number]: {
        dayName: string
        totalCollection: number
        count: number
        totalTrips: number
        totalPassengers: number
        totalDieselCost: number
        totalDriverShare: number
        totalAssigneeShare: number
      }
    } = {
      0: { dayName: 'Sunday', totalCollection: 0, count: 0, totalTrips: 0, totalPassengers: 0, totalDieselCost: 0, totalDriverShare: 0, totalAssigneeShare: 0 },
      1: { dayName: 'Monday', totalCollection: 0, count: 0, totalTrips: 0, totalPassengers: 0, totalDieselCost: 0, totalDriverShare: 0, totalAssigneeShare: 0 },
      2: { dayName: 'Tuesday', totalCollection: 0, count: 0, totalTrips: 0, totalPassengers: 0, totalDieselCost: 0, totalDriverShare: 0, totalAssigneeShare: 0 },
      3: { dayName: 'Wednesday', totalCollection: 0, count: 0, totalTrips: 0, totalPassengers: 0, totalDieselCost: 0, totalDriverShare: 0, totalAssigneeShare: 0 },
      4: { dayName: 'Thursday', totalCollection: 0, count: 0, totalTrips: 0, totalPassengers: 0, totalDieselCost: 0, totalDriverShare: 0, totalAssigneeShare: 0 },
      5: { dayName: 'Friday', totalCollection: 0, count: 0, totalTrips: 0, totalPassengers: 0, totalDieselCost: 0, totalDriverShare: 0, totalAssigneeShare: 0 },
      6: { dayName: 'Saturday', totalCollection: 0, count: 0, totalTrips: 0, totalPassengers: 0, totalDieselCost: 0, totalDriverShare: 0, totalAssigneeShare: 0 },
    }

    // Aggregate data by day of week
    dailyRecords.forEach((record) => {
      const dayOfWeek = record.date.getDay()
      dayOfWeekData[dayOfWeek].totalCollection += record.totalCollection?.toNumber() || 0
      dayOfWeekData[dayOfWeek].count += 1
      dayOfWeekData[dayOfWeek].totalTrips += record.tripCount || 0
      dayOfWeekData[dayOfWeek].totalPassengers += record.passengerCount || 0
      dayOfWeekData[dayOfWeek].totalDieselCost += record.dieselCost?.toNumber() || 0
      dayOfWeekData[dayOfWeek].totalDriverShare += record.driverShare?.toNumber() || 0
      dayOfWeekData[dayOfWeek].totalAssigneeShare += record.assigneeShare?.toNumber() || 0
    })

    // Convert to array with averages and sort by day (Monday first)
    const orderedDays = [1, 2, 3, 4, 5, 6, 0] // Monday to Sunday
    const dayAnalysis = orderedDays.map((day) => {
      const data = dayOfWeekData[day]
      return {
        dayOfWeek: day,
        dayName: data.dayName,
        totalRecords: data.count,
        totalCollection: data.totalCollection,
        averageCollection: data.count > 0 ? data.totalCollection / data.count : 0,
        totalTrips: data.totalTrips,
        averageTrips: data.count > 0 ? data.totalTrips / data.count : 0,
        totalPassengers: data.totalPassengers,
        averagePassengers: data.count > 0 ? data.totalPassengers / data.count : 0,
        totalDieselCost: data.totalDieselCost,
        averageDieselCost: data.count > 0 ? data.totalDieselCost / data.count : 0,
        totalDriverShare: data.totalDriverShare,
        totalAssigneeShare: data.totalAssigneeShare,
      }
    })

    // Find best and worst performing days
    const sortedByAvg = [...dayAnalysis].sort((a, b) => b.averageCollection - a.averageCollection)
    const bestDay = sortedByAvg[0]
    const worstDay = sortedByAvg[sortedByAvg.length - 1]

    return NextResponse.json({
      success: true,
      data: {
        dayAnalysis,
        summary: {
          bestDay: bestDay?.dayName || 'N/A',
          bestDayAverage: bestDay?.averageCollection || 0,
          worstDay: worstDay?.dayName || 'N/A',
          worstDayAverage: worstDay?.averageCollection || 0,
          totalRecords: dailyRecords.length,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching day analysis:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch day analysis' },
      { status: 500 }
    )
  }
}
