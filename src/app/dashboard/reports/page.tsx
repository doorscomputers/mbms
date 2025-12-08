"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
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
  Banknote,
  Fuel,
  TrendingUp,
  Wrench,
  Package,
  Users,
  Bus,
  RefreshCw,
  FileText,
  Calendar,
  Loader2,
} from "lucide-react"

interface Bus {
  id: string
  busNumber: string
  operator?: { id: string; name: string }
}

interface Operator {
  id: string
  name: string
}

interface Summary {
  period: {
    startDate: string
    endDate: string
  }
  counts: {
    buses: number
    drivers: number
    dailyRecords: number
    maintenanceRecords: number
    spareParts: number
  }
  collections: {
    total: number
    average: number
    excessTotal: number
  }
  expenses: {
    diesel: number
    averageDiesel: number
    dieselLiters: number
    coopContribution: number
    maintenance: number
    spareParts: number
    other: number
    total: number
  }
  shares: {
    assignee: number
    driver: number
    total: number
  }
  netIncome: number
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const [buses, setBuses] = useState<Bus[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

  // Get user role and operator ID from session
  const userRole = (session?.user as { role?: string })?.role
  const userOperatorId = (session?.user as { operatorId?: string })?.operatorId
  const isOperator = userRole === "OPERATOR"

  // Filters
  const [busId, setBusId] = useState<string>("all")
  const [operatorId, setOperatorId] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0]
  })

  // For OPERATOR role, lock the operator filter to their own operator
  useEffect(() => {
    if (isOperator && userOperatorId) {
      setOperatorId(userOperatorId)
    }
  }, [isOperator, userOperatorId])

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [busesRes, operatorsRes] = await Promise.all([
          fetch("/api/buses?includeOperator=true"),
          fetch("/api/operators"),
        ])

        const busesData = await busesRes.json()
        const operatorsData = await operatorsRes.json()

        if (busesData.success) setBuses(busesData.data)
        if (operatorsData.success) setOperators(operatorsData.data)
      } catch (error) {
        console.error("Error fetching options:", error)
      }
    }
    fetchOptions()
  }, [])

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (busId && busId !== "all") params.append("busId", busId)
      if (operatorId && operatorId !== "all") params.append("operatorId", operatorId)
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)

      const res = await fetch(`/api/reports/summary?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setSummary(data.data)
      }
    } catch (error) {
      console.error("Error fetching summary:", error)
    } finally {
      setLoading(false)
    }
  }, [busId, operatorId, startDate, endDate])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const setQuickDateRange = (range: "today" | "week" | "month" | "year" | "all") => {
    const now = new Date()
    let start: Date

    switch (range) {
      case "today":
        start = now
        break
      case "week":
        start = new Date(now)
        start.setDate(now.getDate() - 7)
        break
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1)
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

  return (
    <div className="flex flex-col">
      <Header title="Reports & Analytics" />
      <div className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Detailed View</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Report Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                    <Label>Bus</Label>
                    <Select value={busId} onValueChange={setBusId}>
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
                  {/* Hide operator filter for OPERATOR users - they can only see their own data */}
                  {!isOperator && (
                    <div className="space-y-2">
                      <Label>Operator</Label>
                      <Select value={operatorId} onValueChange={setOperatorId}>
                        <SelectTrigger>
                          <SelectValue placeholder="All operators" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Operators</SelectItem>
                          {operators.map((op) => (
                            <SelectItem key={op.id} value={op.id}>
                              {op.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-end">
                    <Button onClick={fetchSummary} disabled={loading} className="w-full">
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setQuickDateRange("today")}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDateRange("week")}>
                    Last 7 Days
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDateRange("month")}>
                    This Month
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

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading report data...</p>
                </div>
              </div>
            )}

            {!loading && summary && (
              <>
                {/* Key Metrics */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Collections
                      </CardTitle>
                      <Banknote className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(summary.collections.total)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Avg: {formatCurrency(summary.collections.average)}/day
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Expenses
                      </CardTitle>
                      <Fuel className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(summary.expenses.total)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Diesel: {formatCurrency(summary.expenses.diesel)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Shares Paid
                      </CardTitle>
                      <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(summary.shares.total)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Assignee + Driver shares
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Net Income
                      </CardTitle>
                      <TrendingUp
                        className={`h-4 w-4 ${summary.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
                      />
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-2xl font-bold ${
                          summary.netIncome >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(summary.netIncome)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        After all deductions
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Expenses Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Expenses Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diesel</span>
                        <span className="font-medium">{formatCurrency(summary.expenses.diesel)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diesel (Liters)</span>
                        <span className="font-medium">{summary.expenses.dieselLiters.toFixed(2)} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Coop Contribution</span>
                        <span className="font-medium">{formatCurrency(summary.expenses.coopContribution)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Maintenance</span>
                        <span className="font-medium">{formatCurrency(summary.expenses.maintenance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Spare Parts</span>
                        <span className="font-medium">{formatCurrency(summary.expenses.spareParts)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Other</span>
                        <span className="font-medium">{formatCurrency(summary.expenses.other)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>Total Expenses</span>
                        <span className="text-red-600">{formatCurrency(summary.expenses.total)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shares Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Shares Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Assignee (Operator)</span>
                        <span className="font-bold text-blue-600 text-lg">
                          {formatCurrency(summary.shares.assignee)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Driver</span>
                        <span className="font-bold text-green-600 text-lg">
                          {formatCurrency(summary.shares.driver)}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>Total Shares</span>
                        <span>{formatCurrency(summary.shares.total)}</span>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-muted-foreground">Excess Collections</span>
                        <span className="font-medium text-emerald-600">
                          {formatCurrency(summary.collections.excessTotal)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Counts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bus className="h-5 w-5" />
                        Activity Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Buses</span>
                        <span className="font-medium">{summary.counts.buses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Drivers</span>
                        <span className="font-medium">{summary.counts.drivers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Records</span>
                        <span className="font-medium">{summary.counts.dailyRecords}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Maintenance Records</span>
                        <span className="font-medium">{summary.counts.maintenanceRecords}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Spare Parts</span>
                        <span className="font-medium">{summary.counts.spareParts}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Reports</CardTitle>
                <CardDescription>
                  Export and view detailed reports by bus, driver, or time period
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Use the data grids in Daily Records, Maintenance, and Spare Parts pages to export
                  detailed data. Each grid supports filtering, grouping, and Excel export.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a href="/dashboard/daily-records">
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Daily Records
                    </Button>
                  </a>
                  <a href="/dashboard/maintenance">
                    <Button variant="outline">
                      <Wrench className="h-4 w-4 mr-2" />
                      Maintenance Records
                    </Button>
                  </a>
                  <a href="/dashboard/spare-parts">
                    <Button variant="outline">
                      <Package className="h-4 w-4 mr-2" />
                      Spare Parts
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
