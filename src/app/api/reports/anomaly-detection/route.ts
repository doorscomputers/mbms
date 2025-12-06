import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { SETTINGS_KEYS, DEFAULT_SETTINGS, isSunday } from '@/lib/types'

interface DailyRecordWithRelations {
  id: string
  date: Date
  busId: string
  driverId: string
  totalCollection: { toNumber(): number } | null
  dieselCost: { toNumber(): number } | null
  dieselLiters: { toNumber(): number } | null
  odometerStart: { toNumber(): number } | null
  odometerEnd: { toNumber(): number } | null
  minimumCollection: { toNumber(): number } | null
  bus: {
    busNumber: string
  }
  driver: {
    id: string
    name: string
  }
}

interface DailyRecordAnalysis {
  busNumber: string
  driverName: string
  driverId: string
  collection: number
  dieselCost: number
  dieselRatio: number
  deviationPercent: number
  isBelowMinimum: boolean
  isSuspicious: boolean
  kmPerLiter: number | null
}

interface DailyAnalysis {
  date: string
  fleetAvgCollection: number
  fleetAvgDieselCost: number
  fleetAvgDieselRatio: number
  busCount: number
  isSlowDay: boolean
  records: DailyRecordAnalysis[]
}

interface DriverSummary {
  driverId: string
  driverName: string
  totalDays: number
  belowMinimumCount: number
  suspiciousDaysCount: number
  avgDeviation: number
  avgDieselRatio: number
  qualifiesForSuspension: boolean
  worstDays: { date: string; collection: number; fleetAvg: number; deviation: number }[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get settings
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            SETTINGS_KEYS.WEEKDAY_MINIMUM_COLLECTION,
            SETTINGS_KEYS.SUNDAY_MINIMUM_COLLECTION,
            SETTINGS_KEYS.SUSPENSION_THRESHOLD,
          ],
        },
      },
    })

    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value
      return acc
    }, {} as Record<string, string>)

    const weekdayMinimum = parseFloat(
      settingsMap[SETTINGS_KEYS.WEEKDAY_MINIMUM_COLLECTION] ||
        DEFAULT_SETTINGS[SETTINGS_KEYS.WEEKDAY_MINIMUM_COLLECTION]
    )
    const sundayMinimum = parseFloat(
      settingsMap[SETTINGS_KEYS.SUNDAY_MINIMUM_COLLECTION] ||
        DEFAULT_SETTINGS[SETTINGS_KEYS.SUNDAY_MINIMUM_COLLECTION]
    )
    const suspensionThreshold = parseInt(
      settingsMap[SETTINGS_KEYS.SUSPENSION_THRESHOLD] ||
        DEFAULT_SETTINGS[SETTINGS_KEYS.SUSPENSION_THRESHOLD]
    )

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    // Fetch all daily records with relations
    const records = await prisma.dailyRecord.findMany({
      where: startDate || endDate ? { date: dateFilter } : undefined,
      include: {
        bus: {
          select: { busNumber: true },
        },
        driver: {
          select: { id: true, name: true },
        },
      },
      orderBy: { date: 'desc' },
    }) as DailyRecordWithRelations[]

    // Group records by date
    const recordsByDate = new Map<string, DailyRecordWithRelations[]>()
    records.forEach((record) => {
      const dateStr = record.date.toISOString().split('T')[0]
      if (!recordsByDate.has(dateStr)) {
        recordsByDate.set(dateStr, [])
      }
      recordsByDate.get(dateStr)!.push(record)
    })

    // Analyze each day
    const dailyAnalysis: DailyAnalysis[] = []
    const driverStats = new Map<
      string,
      {
        name: string
        records: {
          date: string
          collection: number
          fleetAvg: number
          deviation: number
          isBelowMinimum: boolean
          isSuspicious: boolean
          dieselRatio: number
        }[]
      }
    >()

    for (const [dateStr, dayRecords] of recordsByDate) {
      const date = new Date(dateStr)
      const minimumCollection = isSunday(date) ? sundayMinimum : weekdayMinimum
      const busCount = dayRecords.length

      if (busCount === 0) continue

      // Calculate fleet averages for this day
      const fleetTotalCollection = dayRecords.reduce(
        (sum, r) => sum + (r.totalCollection?.toNumber() || 0),
        0
      )
      const fleetTotalDieselCost = dayRecords.reduce(
        (sum, r) => sum + (r.dieselCost?.toNumber() || 0),
        0
      )
      const fleetAvgCollection = fleetTotalCollection / busCount
      const fleetAvgDieselCost = fleetTotalDieselCost / busCount

      // Calculate average diesel ratio (diesel cost / collection)
      const dieselRatios = dayRecords
        .map((r) => {
          const collection = r.totalCollection?.toNumber() || 0
          const diesel = r.dieselCost?.toNumber() || 0
          return collection > 0 ? diesel / collection : 0
        })
        .filter((r) => r > 0)
      const fleetAvgDieselRatio =
        dieselRatios.length > 0
          ? dieselRatios.reduce((a, b) => a + b, 0) / dieselRatios.length
          : 0

      // Determine if it's a "slow day" (fleet average below minimum)
      const isSlowDay = fleetAvgCollection < minimumCollection

      // Analyze each record for the day
      const recordAnalysis: DailyRecordAnalysis[] = dayRecords.map((record) => {
        const collection = record.totalCollection?.toNumber() || 0
        const dieselCost = record.dieselCost?.toNumber() || 0
        const dieselRatio = collection > 0 ? dieselCost / collection : 0

        // Calculate km/L if odometer data exists
        const odometerStart = record.odometerStart?.toNumber() || 0
        const odometerEnd = record.odometerEnd?.toNumber() || 0
        const dieselLiters = record.dieselLiters?.toNumber() || 0
        let kmPerLiter: number | null = null
        if (odometerEnd > odometerStart && dieselLiters > 0) {
          kmPerLiter = (odometerEnd - odometerStart) / dieselLiters
        }

        // Deviation from fleet average
        const deviationPercent =
          fleetAvgCollection > 0
            ? ((collection - fleetAvgCollection) / fleetAvgCollection) * 100
            : 0

        // Below minimum check
        const isBelowMinimum = collection < minimumCollection

        // Suspicious: >20% below fleet average AND diesel ratio higher than fleet avg * 1.2
        // BUT only if it's NOT a slow day (otherwise all drivers would be flagged)
        const isSuspicious =
          !isSlowDay &&
          deviationPercent < -20 &&
          dieselRatio > fleetAvgDieselRatio * 1.2

        return {
          busNumber: record.bus.busNumber,
          driverName: record.driver.name,
          driverId: record.driver.id,
          collection,
          dieselCost,
          dieselRatio,
          deviationPercent,
          isBelowMinimum,
          isSuspicious,
          kmPerLiter,
        }
      })

      // Sort by collection ascending to see lowest first
      recordAnalysis.sort((a, b) => a.collection - b.collection)

      dailyAnalysis.push({
        date: dateStr,
        fleetAvgCollection,
        fleetAvgDieselCost,
        fleetAvgDieselRatio,
        busCount,
        isSlowDay,
        records: recordAnalysis,
      })

      // Track per-driver stats
      recordAnalysis.forEach((r) => {
        if (!driverStats.has(r.driverId)) {
          driverStats.set(r.driverId, { name: r.driverName, records: [] })
        }
        driverStats.get(r.driverId)!.records.push({
          date: dateStr,
          collection: r.collection,
          fleetAvg: fleetAvgCollection,
          deviation: r.deviationPercent,
          isBelowMinimum: r.isBelowMinimum,
          isSuspicious: r.isSuspicious,
          dieselRatio: r.dieselRatio,
        })
      })
    }

    // Build driver summary
    const driverSummary: DriverSummary[] = []
    for (const [driverId, stats] of driverStats) {
      const totalDays = stats.records.length
      const belowMinimumCount = stats.records.filter((r) => r.isBelowMinimum).length
      const suspiciousDaysCount = stats.records.filter((r) => r.isSuspicious).length
      const avgDeviation =
        totalDays > 0
          ? stats.records.reduce((sum, r) => sum + r.deviation, 0) / totalDays
          : 0
      const avgDieselRatio =
        totalDays > 0
          ? stats.records.reduce((sum, r) => sum + r.dieselRatio, 0) / totalDays
          : 0

      // Find worst performing days (sorted by deviation ascending)
      const worstDays = [...stats.records]
        .sort((a, b) => a.deviation - b.deviation)
        .slice(0, 3)
        .map((r) => ({
          date: r.date,
          collection: r.collection,
          fleetAvg: r.fleetAvg,
          deviation: r.deviation,
        }))

      driverSummary.push({
        driverId,
        driverName: stats.name,
        totalDays,
        belowMinimumCount,
        suspiciousDaysCount,
        avgDeviation,
        avgDieselRatio,
        qualifiesForSuspension: belowMinimumCount >= suspensionThreshold,
        worstDays,
      })
    }

    // Sort driver summary by belowMinimumCount descending
    driverSummary.sort((a, b) => b.belowMinimumCount - a.belowMinimumCount)

    // Calculate overall summary
    const totalRecords = records.length
    const belowMinimumRecords = dailyAnalysis.reduce(
      (sum, day) => sum + day.records.filter((r) => r.isBelowMinimum).length,
      0
    )
    const suspiciousRecords = dailyAnalysis.reduce(
      (sum, day) => sum + day.records.filter((r) => r.isSuspicious).length,
      0
    )
    const driversAtRisk = driverSummary.filter((d) => d.qualifiesForSuspension).length

    return NextResponse.json({
      success: true,
      data: {
        dailyAnalysis,
        driverSummary,
        summary: {
          totalRecords,
          belowMinimumRecords,
          suspiciousRecords,
          driversAtRisk,
          suspensionThreshold,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching anomaly detection data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch anomaly detection data' },
      { status: 500 }
    )
  }
}
