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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/types"
import {
  Fuel,
  TrendingUp,
  Users,
  Bus,
  RefreshCw,
  Calendar,
  Trophy,
  BarChart3,
  Award,
} from "lucide-react"

interface DriverPerformance {
  rank: number
  driverId: string
  driverName: string
  totalDays: number
  totalCollection: number
  averageCollection: number
  totalDriverShare: number
  averageDriverShare: number
  totalTrips: number
  averageTripsPerDay: number
  totalPassengers: number
  averagePassengersPerDay: number
  totalDieselLiters: number
  totalDieselCost: number
  collectionPerTrip: number
}

interface DayAnalysis {
  dayOfWeek: number
  dayName: string
  totalRecords: number
  totalCollection: number
  averageCollection: number
  totalTrips: number
  averageTrips: number
  totalPassengers: number
  averagePassengers: number
  totalDieselCost: number
  averageDieselCost: number
}

interface DayAnalysisData {
  dayAnalysis: DayAnalysis[]
  summary: {
    bestDay: string
    bestDayAverage: number
    worstDay: string
    worstDayAverage: number
    totalRecords: number
  }
}

interface DieselByBus {
  busId: string
  busNumber: string
  plateNumber: string
  totalRecords: number
  totalDieselLiters: number
  totalDieselCost: number
  totalCollection: number
  totalDistance: number
  kmPerLiter: number
  costPerKm: number
  averageLitersPerDay: number
  averageCostPerDay: number
  dieselCostPercentage: number
}

interface DieselData {
  byBus: DieselByBus[]
  busChart: { busNumber: string; totalLiters: number; totalCost: number; kmPerLiter: number }[]
  totals: {
    totalLiters: number
    totalCost: number
    totalDistance: number
    totalRecords: number
    overallKmPerLiter: number
    averageCostPerLiter: number
  }
}

interface BusPerformance {
  rank: number
  busId: string
  busNumber: string
  plateNumber: string
  operatorName: string
  totalDays: number
  totalCollection: number
  averageCollection: number
  totalAssigneeShare: number
  totalDriverShare: number
  totalTrips: number
  averageTripsPerDay: number
  totalPassengers: number
  averagePassengersPerDay: number
  totalDieselLiters: number
  totalDieselCost: number
  totalDistance: number
  kmPerLiter: number
  totalMaintenanceCost: number
  totalExpenses: number
  netIncome: number
  profitMargin: number
  collectionPerKm: number
}

interface BusInterface {
  id: string
  busNumber: string
}

export default function AnalyticsPage() {
  const [buses, setBuses] = useState<BusInterface[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("drivers")

  // Filter states
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [selectedBusId, setSelectedBusId] = useState<string>("all")

  // Data states
  const [driverPerformance, setDriverPerformance] = useState<DriverPerformance[]>([])
  const [dayAnalysis, setDayAnalysis] = useState<DayAnalysisData | null>(null)
  const [dieselData, setDieselData] = useState<DieselData | null>(null)
  const [busPerformance, setBusPerformance] = useState<BusPerformance[]>([])

  useEffect(() => {
    async function fetchBuses() {
      try {
        const res = await fetch("/api/buses")
        const data = await res.json()
        if (data.success) setBuses(data.data)
      } catch (error) {
        console.error("Error fetching buses:", error)
      }
    }
    fetchBuses()
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (startDate) params.append("startDate", startDate)
    if (endDate) params.append("endDate", endDate)
    if (selectedBusId && selectedBusId !== "all") params.append("busId", selectedBusId)

    try {
      const [driverRes, dayRes, dieselRes, busRes] = await Promise.all([
        fetch(`/api/reports/driver-performance?${params.toString()}`),
        fetch(`/api/reports/day-analysis?${params.toString()}`),
        fetch(`/api/reports/diesel-consumption?${params.toString()}`),
        fetch(`/api/reports/bus-performance?${params.toString()}`),
      ])

      const [driverData, dayData, dieselDataRes, busData] = await Promise.all([
        driverRes.json(),
        dayRes.json(),
        dieselRes.json(),
        busRes.json(),
      ])

      if (driverData.success) setDriverPerformance(driverData.data)
      if (dayData.success) setDayAnalysis(dayData.data)
      if (dieselDataRes.success) setDieselData(dieselDataRes.data)
      if (busData.success) setBusPerformance(busData.data.buses)
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedBusId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const setQuickDateRange = (range: "week" | "month" | "quarter" | "year" | "all") => {
    const now = new Date()
    let start: Date

    switch (range) {
      case "week":
        start = new Date(now)
        start.setDate(now.getDate() - 7)
        break
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case "quarter":
        start = new Date(now)
        start.setMonth(now.getMonth() - 3)
        break
      case "year":
        start = new Date(now.getFullYear(), 0, 1)
        break
      case "all":
        setStartDate("")
        setEndDate("")
        return
    }

    setStartDate(start.toISOString().split("T")[0])
    setEndDate(now.toISOString().split("T")[0])
  }

  // Find max values for visual bars
  const maxCollection = Math.max(...driverPerformance.map((d) => d.totalCollection), 1)
  const maxDayCollection = dayAnalysis
    ? Math.max(...dayAnalysis.dayAnalysis.map((d) => d.averageCollection), 1)
    : 1
  const maxDieselLiters = dieselData
    ? Math.max(...dieselData.byBus.map((b) => b.totalDieselLiters), 1)
    : 1
  const maxBusCollection = Math.max(...busPerformance.map((b) => b.totalCollection), 1)

  return (
    <div className="flex flex-col">
      <Header title="Fleet Analytics" />
      <div className="flex-1 p-4 md:p-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Bus (for Diesel Report)</Label>
                <Select value={selectedBusId} onValueChange={setSelectedBusId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All buses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buses</SelectItem>
                    {buses.map((bus) => (
                      <SelectItem key={bus.id} value={bus.id}>
                        Bus #{bus.busNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchData} disabled={loading} className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange("week")}>
                Last 7 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange("month")}>
                This Month
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange("quarter")}>
                Last 3 Months
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange("year")}>
                This Year
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange("all")}>
                All Time
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Driver Performance</span>
              <span className="sm:hidden">Drivers</span>
            </TabsTrigger>
            <TabsTrigger value="days" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Day Analysis</span>
              <span className="sm:hidden">Days</span>
            </TabsTrigger>
            <TabsTrigger value="diesel" className="flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              <span className="hidden sm:inline">Diesel Consumption</span>
              <span className="sm:hidden">Diesel</span>
            </TabsTrigger>
            <TabsTrigger value="buses" className="flex items-center gap-2">
              <Bus className="h-4 w-4" />
              <span className="hidden sm:inline">Bus Performance</span>
              <span className="sm:hidden">Buses</span>
            </TabsTrigger>
          </TabsList>

          {/* Driver Performance Tab */}
          <TabsContent value="drivers" className="space-y-6">
            {/* Top 3 Drivers */}
            {driverPerformance.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                {driverPerformance.slice(0, 3).map((driver, index) => (
                  <Card
                    key={driver.driverId}
                    className={`${
                      index === 0
                        ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                        : index === 1
                        ? "border-gray-400 bg-gray-50 dark:bg-gray-950/20"
                        : "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Trophy
                          className={`h-6 w-6 ${
                            index === 0
                              ? "text-yellow-500"
                              : index === 1
                              ? "text-gray-400"
                              : "text-orange-400"
                          }`}
                        />
                        <span className="text-2xl font-bold">#{index + 1}</span>
                      </div>
                      <CardTitle className="text-lg">{driver.driverName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(driver.totalCollection)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {driver.totalDays} days | Avg: {formatCurrency(driver.averageCollection)}/day
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Driver Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Driver Performance Comparison
                </CardTitle>
                <CardDescription>
                  Ranked by total collection within the selected date range
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Rank</th>
                        <th className="text-left py-3 px-2">Driver</th>
                        <th className="text-right py-3 px-2">Days</th>
                        <th className="text-right py-3 px-2">Total Collection</th>
                        <th className="text-right py-3 px-2 hidden md:table-cell">Avg/Day</th>
                        <th className="text-right py-3 px-2 hidden lg:table-cell">Trips</th>
                        <th className="text-right py-3 px-2 hidden lg:table-cell">Driver Share</th>
                        <th className="py-3 px-2 w-32 hidden sm:table-cell">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverPerformance.map((driver) => (
                        <tr key={driver.driverId} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                driver.rank === 1
                                  ? "bg-yellow-100 text-yellow-700"
                                  : driver.rank === 2
                                  ? "bg-gray-100 text-gray-700"
                                  : driver.rank === 3
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {driver.rank}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-medium">{driver.driverName}</td>
                          <td className="py-3 px-2 text-right">{driver.totalDays}</td>
                          <td className="py-3 px-2 text-right font-semibold">
                            {formatCurrency(driver.totalCollection)}
                          </td>
                          <td className="py-3 px-2 text-right hidden md:table-cell">
                            {formatCurrency(driver.averageCollection)}
                          </td>
                          <td className="py-3 px-2 text-right hidden lg:table-cell">
                            {driver.totalTrips}
                          </td>
                          <td className="py-3 px-2 text-right text-green-600 hidden lg:table-cell">
                            {formatCurrency(driver.totalDriverShare)}
                          </td>
                          <td className="py-3 px-2 hidden sm:table-cell">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${(driver.totalCollection / maxCollection) * 100}%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Day Analysis Tab */}
          <TabsContent value="days" className="space-y-6">
            {dayAnalysis && (
              <>
                {/* Best/Worst Day Summary */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <TrendingUp className="h-5 w-5" />
                        Best Performing Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                        {dayAnalysis.summary.bestDay}
                      </div>
                      <p className="text-muted-foreground">
                        Average: {formatCurrency(dayAnalysis.summary.bestDayAverage)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <TrendingUp className="h-5 w-5 rotate-180" />
                        Lowest Performing Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                        {dayAnalysis.summary.worstDay}
                      </div>
                      <p className="text-muted-foreground">
                        Average: {formatCurrency(dayAnalysis.summary.worstDayAverage)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Day of Week Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Collection by Day of Week
                    </CardTitle>
                    <CardDescription>
                      Average collection for each day - helps identify peak days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dayAnalysis.dayAnalysis.map((day) => (
                        <div key={day.dayOfWeek} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{day.dayName}</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(day.averageCollection)} avg ({day.totalRecords} records)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-6 relative">
                            <div
                              className={`h-6 rounded-full flex items-center justify-end pr-2 ${
                                day.dayName === dayAnalysis.summary.bestDay
                                  ? "bg-green-500"
                                  : day.dayName === dayAnalysis.summary.worstDay
                                  ? "bg-red-400"
                                  : "bg-primary"
                              }`}
                              style={{
                                width: `${Math.max(
                                  (day.averageCollection / maxDayCollection) * 100,
                                  5
                                )}%`,
                              }}
                            >
                              <span className="text-xs text-white font-medium">
                                {formatCurrency(day.averageCollection)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Day Details Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Day Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2">Day</th>
                            <th className="text-right py-3 px-2">Records</th>
                            <th className="text-right py-3 px-2">Avg Collection</th>
                            <th className="text-right py-3 px-2 hidden md:table-cell">Avg Trips</th>
                            <th className="text-right py-3 px-2 hidden lg:table-cell">Avg Passengers</th>
                            <th className="text-right py-3 px-2 hidden lg:table-cell">Avg Diesel Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayAnalysis.dayAnalysis.map((day) => (
                            <tr key={day.dayOfWeek} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2 font-medium">{day.dayName}</td>
                              <td className="py-3 px-2 text-right">{day.totalRecords}</td>
                              <td className="py-3 px-2 text-right font-semibold">
                                {formatCurrency(day.averageCollection)}
                              </td>
                              <td className="py-3 px-2 text-right hidden md:table-cell">
                                {day.averageTrips.toFixed(1)}
                              </td>
                              <td className="py-3 px-2 text-right hidden lg:table-cell">
                                {day.averagePassengers.toFixed(0)}
                              </td>
                              <td className="py-3 px-2 text-right hidden lg:table-cell">
                                {formatCurrency(day.averageDieselCost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Diesel Consumption Tab */}
          <TabsContent value="diesel" className="space-y-6">
            {dieselData && (
              <>
                {/* Diesel Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Total Diesel</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dieselData.totals.totalLiters.toFixed(2)} L
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dieselData.totals.totalRecords} records
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Total Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(dieselData.totals.totalCost)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Avg: {formatCurrency(dieselData.totals.averageCostPerLiter)}/L
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Total Distance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dieselData.totals.totalDistance.toFixed(0)} km
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Fuel Efficiency</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {dieselData.totals.overallKmPerLiter.toFixed(2)} km/L
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Diesel by Bus Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Fuel className="h-5 w-5" />
                      Diesel Consumption by Bus
                    </CardTitle>
                    <CardDescription>
                      Total liters consumed per bus within the date range
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dieselData.byBus
                        .filter((b) => b.totalDieselLiters > 0)
                        .map((bus) => (
                          <div key={bus.busId} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">Bus #{bus.busNumber}</span>
                              <span className="text-muted-foreground">
                                {bus.totalDieselLiters.toFixed(2)} L | {formatCurrency(bus.totalDieselCost)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6 relative">
                              <div
                                className="bg-orange-500 h-6 rounded-full flex items-center justify-end pr-2"
                                style={{
                                  width: `${Math.max(
                                    (bus.totalDieselLiters / maxDieselLiters) * 100,
                                    10
                                  )}%`,
                                }}
                              >
                                <span className="text-xs text-white font-medium">
                                  {bus.totalDieselLiters.toFixed(1)} L
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Diesel Details Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Diesel Details by Bus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2">Bus</th>
                            <th className="text-right py-3 px-2">Days</th>
                            <th className="text-right py-3 px-2">Total Liters</th>
                            <th className="text-right py-3 px-2">Total Cost</th>
                            <th className="text-right py-3 px-2 hidden md:table-cell">Avg/Day</th>
                            <th className="text-right py-3 px-2 hidden lg:table-cell">Distance</th>
                            <th className="text-right py-3 px-2 hidden lg:table-cell">km/L</th>
                            <th className="text-right py-3 px-2 hidden xl:table-cell">% of Collection</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dieselData.byBus.map((bus) => (
                            <tr key={bus.busId} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2 font-medium">#{bus.busNumber}</td>
                              <td className="py-3 px-2 text-right">{bus.totalRecords}</td>
                              <td className="py-3 px-2 text-right">
                                {bus.totalDieselLiters.toFixed(2)} L
                              </td>
                              <td className="py-3 px-2 text-right text-red-600 font-semibold">
                                {formatCurrency(bus.totalDieselCost)}
                              </td>
                              <td className="py-3 px-2 text-right hidden md:table-cell">
                                {bus.averageLitersPerDay.toFixed(2)} L
                              </td>
                              <td className="py-3 px-2 text-right hidden lg:table-cell">
                                {bus.totalDistance.toFixed(0)} km
                              </td>
                              <td className="py-3 px-2 text-right hidden lg:table-cell">
                                <span
                                  className={`${
                                    bus.kmPerLiter > dieselData.totals.overallKmPerLiter
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {bus.kmPerLiter.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right hidden xl:table-cell">
                                {bus.dieselCostPercentage.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Bus Performance Tab */}
          <TabsContent value="buses" className="space-y-6">
            {/* Top 3 Buses */}
            {busPerformance.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                {busPerformance.slice(0, 3).map((bus, index) => (
                  <Card
                    key={bus.busId}
                    className={`${
                      index === 0
                        ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                        : index === 1
                        ? "border-gray-400 bg-gray-50 dark:bg-gray-950/20"
                        : "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Award
                          className={`h-6 w-6 ${
                            index === 0
                              ? "text-yellow-500"
                              : index === 1
                              ? "text-gray-400"
                              : "text-orange-400"
                          }`}
                        />
                        <span className="text-2xl font-bold">#{index + 1}</span>
                      </div>
                      <CardTitle className="text-lg">Bus #{bus.busNumber}</CardTitle>
                      <CardDescription>{bus.operatorName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(bus.totalCollection)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {bus.totalDays} days | Avg: {formatCurrency(bus.averageCollection)}/day
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        Net Income: {formatCurrency(bus.netIncome)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Bus Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  Bus Performance Comparison
                </CardTitle>
                <CardDescription>
                  Ranked by total collection within the selected date range
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Rank</th>
                        <th className="text-left py-3 px-2">Bus</th>
                        <th className="text-left py-3 px-2 hidden lg:table-cell">Operator</th>
                        <th className="text-right py-3 px-2">Days</th>
                        <th className="text-right py-3 px-2">Total Collection</th>
                        <th className="text-right py-3 px-2 hidden md:table-cell">Avg/Day</th>
                        <th className="text-right py-3 px-2 hidden lg:table-cell">Diesel</th>
                        <th className="text-right py-3 px-2 hidden xl:table-cell">Net Income</th>
                        <th className="py-3 px-2 w-32 hidden sm:table-cell">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {busPerformance.map((bus) => (
                        <tr key={bus.busId} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                bus.rank === 1
                                  ? "bg-yellow-100 text-yellow-700"
                                  : bus.rank === 2
                                  ? "bg-gray-100 text-gray-700"
                                  : bus.rank === 3
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {bus.rank}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-medium">#{bus.busNumber}</td>
                          <td className="py-3 px-2 hidden lg:table-cell">{bus.operatorName}</td>
                          <td className="py-3 px-2 text-right">{bus.totalDays}</td>
                          <td className="py-3 px-2 text-right font-semibold">
                            {formatCurrency(bus.totalCollection)}
                          </td>
                          <td className="py-3 px-2 text-right hidden md:table-cell">
                            {formatCurrency(bus.averageCollection)}
                          </td>
                          <td className="py-3 px-2 text-right text-red-600 hidden lg:table-cell">
                            {formatCurrency(bus.totalDieselCost)}
                          </td>
                          <td className="py-3 px-2 text-right hidden xl:table-cell">
                            <span
                              className={bus.netIncome >= 0 ? "text-green-600" : "text-red-600"}
                            >
                              {formatCurrency(bus.netIncome)}
                            </span>
                          </td>
                          <td className="py-3 px-2 hidden sm:table-cell">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${(bus.totalCollection / maxBusCollection) * 100}%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
