"use client"

import { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/types"
import {
  AlertTriangle,
  RefreshCw,
  Calendar,
  Users,
  TrendingDown,
  ShieldAlert,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

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

interface AnomalyData {
  dailyAnalysis: DailyAnalysis[]
  driverSummary: DriverSummary[]
  summary: {
    totalRecords: number
    belowMinimumRecords: number
    suspiciousRecords: number
    driversAtRisk: number
    suspensionThreshold: number
  }
}

type DateFilterOption = "this_week" | "last_week" | "this_month" | "last_month" | "this_quarter" | "last_quarter" | "custom"

function getDateRange(option: DateFilterOption): { startDate: string; endDate: string } {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const day = today.getDate()
  const dayOfWeek = today.getDay()

  switch (option) {
    case "this_week": {
      const startOfWeek = new Date(year, month, day - dayOfWeek)
      return {
        startDate: startOfWeek.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }
    }
    case "last_week": {
      const startOfLastWeek = new Date(year, month, day - dayOfWeek - 7)
      const endOfLastWeek = new Date(year, month, day - dayOfWeek - 1)
      return {
        startDate: startOfLastWeek.toISOString().split("T")[0],
        endDate: endOfLastWeek.toISOString().split("T")[0],
      }
    }
    case "this_month": {
      const startOfMonth = new Date(year, month, 1)
      return {
        startDate: startOfMonth.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }
    }
    case "last_month": {
      const startOfLastMonth = new Date(year, month - 1, 1)
      const endOfLastMonth = new Date(year, month, 0)
      return {
        startDate: startOfLastMonth.toISOString().split("T")[0],
        endDate: endOfLastMonth.toISOString().split("T")[0],
      }
    }
    case "this_quarter": {
      const quarterStart = Math.floor(month / 3) * 3
      const startOfQuarter = new Date(year, quarterStart, 1)
      return {
        startDate: startOfQuarter.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }
    }
    case "last_quarter": {
      const lastQuarterStart = Math.floor(month / 3) * 3 - 3
      const startOfLastQuarter = new Date(year, lastQuarterStart, 1)
      const endOfLastQuarter = new Date(year, lastQuarterStart + 3, 0)
      return {
        startDate: startOfLastQuarter.toISOString().split("T")[0],
        endDate: endOfLastQuarter.toISOString().split("T")[0],
      }
    }
    default:
      return {
        startDate: new Date(year, month, 1).toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }
  }
}

export default function AnomalyDetectionPage() {
  const [data, setData] = useState<AnomalyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("this_month")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const range = dateFilter === "custom"
        ? { startDate: customStartDate, endDate: customEndDate }
        : getDateRange(dateFilter)

      const params = new URLSearchParams()
      if (range.startDate) params.append("startDate", range.startDate)
      if (range.endDate) params.append("endDate", range.endDate)

      const res = await fetch(`/api/reports/anomaly-detection?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error("Error fetching anomaly data:", error)
    } finally {
      setLoading(false)
    }
  }, [dateFilter, customStartDate, customEndDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleDayExpansion = (date: string) => {
    setExpandedDays((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
  }

  const getDeviationColor = (deviation: number) => {
    if (deviation >= -15) return "text-green-600"
    if (deviation >= -25) return "text-yellow-600"
    return "text-red-600"
  }

  const getDeviationBg = (deviation: number) => {
    if (deviation >= -15) return "bg-green-100"
    if (deviation >= -25) return "bg-yellow-100"
    return "bg-red-100"
  }

  return (
    <div className="flex flex-col">
      <Header title="Anomaly Detection" />
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Date Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select
                  value={dateFilter}
                  onValueChange={(v) => setDateFilter(v as DateFilterOption)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_quarter">This Quarter</SelectItem>
                    <SelectItem value="last_quarter">Last Quarter</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateFilter === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                </>
              )}

              <Button onClick={fetchData} disabled={loading} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Records
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.totalRecords}</div>
                  <p className="text-xs text-muted-foreground">
                    Daily records analyzed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Below Minimum
                  </CardTitle>
                  <TrendingDown className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {data.summary.belowMinimumRecords}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Records below minimum collection
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Suspicious
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {data.summary.suspiciousRecords}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Records flagged as suspicious
                  </p>
                </CardContent>
              </Card>

              <Card className={data.summary.driversAtRisk > 0 ? "border-red-500 border-2" : ""}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Drivers at Risk
                  </CardTitle>
                  <ShieldAlert className={`h-4 w-4 ${data.summary.driversAtRisk > 0 ? "text-red-600" : "text-green-600"}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${data.summary.driversAtRisk > 0 ? "text-red-600" : "text-green-600"}`}>
                    {data.summary.driversAtRisk}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Qualify for suspension review (≥{data.summary.suspensionThreshold} days)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Drivers at Risk Panel */}
            {data.summary.driversAtRisk > 0 && (
              <Card className="border-red-500 border-2 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <ShieldAlert className="h-5 w-5" />
                    Drivers Requiring Suspension Review
                  </CardTitle>
                  <CardDescription className="text-red-600">
                    These drivers have reached or exceeded the suspension threshold of {data.summary.suspensionThreshold} below-minimum days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.driverSummary
                      .filter((d) => d.qualifiesForSuspension)
                      .map((driver) => (
                        <div
                          key={driver.driverId}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
                        >
                          <div>
                            <p className="font-semibold text-red-700">{driver.driverName}</p>
                            <p className="text-sm text-red-600">
                              {driver.belowMinimumCount} below-minimum days | {driver.suspiciousDaysCount} suspicious days
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-red-100 text-red-700">
                            REVIEW
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Driver Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Driver Performance Summary
                </CardTitle>
                <CardDescription>
                  Overview of all drivers within the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Driver</th>
                        <th className="text-center p-2">Days</th>
                        <th className="text-center p-2">Below Min</th>
                        <th className="text-center p-2">Suspicious</th>
                        <th className="text-center p-2">Avg Deviation</th>
                        <th className="text-center p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.driverSummary.map((driver) => (
                        <tr key={driver.driverId} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{driver.driverName}</td>
                          <td className="p-2 text-center">{driver.totalDays}</td>
                          <td className="p-2 text-center">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              driver.belowMinimumCount >= data.summary.suspensionThreshold
                                ? "bg-red-100 text-red-700"
                                : driver.belowMinimumCount > 0
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                            }`}>
                              {driver.belowMinimumCount}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              driver.suspiciousDaysCount > 0
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}>
                              {driver.suspiciousDaysCount}
                            </span>
                          </td>
                          <td className={`p-2 text-center font-medium ${getDeviationColor(driver.avgDeviation)}`}>
                            {driver.avgDeviation >= 0 ? "+" : ""}{driver.avgDeviation.toFixed(1)}%
                          </td>
                          <td className="p-2 text-center">
                            {driver.qualifiesForSuspension ? (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" />
                                REVIEW
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Daily Fleet Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Daily Fleet Comparison
                </CardTitle>
                <CardDescription>
                  Click on a day to see individual driver performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.dailyAnalysis.map((day) => (
                    <div key={day.date} className="border rounded-lg overflow-hidden">
                      <button
                        className={`w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 ${
                          day.isSlowDay ? "bg-gray-100" : ""
                        }`}
                        onClick={() => toggleDayExpansion(day.date)}
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{formatDate(day.date)}</span>
                          {day.isSlowDay && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700">
                              Slow Day
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            Fleet Avg: <span className="font-medium text-foreground">{formatCurrency(day.fleetAvgCollection)}</span>
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {day.busCount} buses
                          </span>
                          {day.records.some((r) => r.isSuspicious) && (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          {expandedDays.has(day.date) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </button>

                      {expandedDays.has(day.date) && (
                        <div className="border-t p-3 bg-muted/20">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Bus</th>
                                  <th className="text-left p-2">Driver</th>
                                  <th className="text-right p-2">Collection</th>
                                  <th className="text-right p-2">Diesel</th>
                                  <th className="text-center p-2">Deviation</th>
                                  <th className="text-center p-2">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {day.records.map((record, idx) => (
                                  <tr key={idx} className={`border-b ${record.isSuspicious ? "bg-red-50" : ""}`}>
                                    <td className="p-2">{record.busNumber}</td>
                                    <td className="p-2">{record.driverName}</td>
                                    <td className="p-2 text-right font-medium">
                                      {formatCurrency(record.collection)}
                                    </td>
                                    <td className="p-2 text-right">
                                      {formatCurrency(record.dieselCost)}
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getDeviationBg(record.deviationPercent)} ${getDeviationColor(record.deviationPercent)}`}>
                                        {record.deviationPercent >= 0 ? "+" : ""}{record.deviationPercent.toFixed(1)}%
                                      </span>
                                    </td>
                                    <td className="p-2 text-center">
                                      {record.isSuspicious ? (
                                        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
                                          <AlertTriangle className="h-3 w-3" />
                                          Suspicious
                                        </span>
                                      ) : record.isBelowMinimum ? (
                                        <span className="inline-flex items-center text-yellow-600 text-xs font-medium">
                                          Below Min
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center text-green-600 text-xs font-medium">
                                          Normal
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {data.dailyAnalysis.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No data available for the selected period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                      Normal
                    </span>
                    <span className="text-muted-foreground">Within 15% of fleet average</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                      Warning
                    </span>
                    <span className="text-muted-foreground">15-25% below fleet average</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                      Suspicious
                    </span>
                    <span className="text-muted-foreground">&gt;25% below with high diesel ratio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700">
                      Slow Day
                    </span>
                    <span className="text-muted-foreground">Fleet average below minimum (not suspicious)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Failed to load data
          </div>
        )}
      </div>
    </div>
  )
}
