"use client"

import { useEffect, useState } from "react"
import {
  Bus,
  Users,
  DollarSign,
  Fuel,
  TrendingUp,
  AlertTriangle,
  Wrench,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { formatCurrency } from "@/lib/types"

interface DashboardSummary {
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

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSummary() {
      try {
        // Get current month dates
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        const res = await fetch(
          `/api/reports/summary?startDate=${startOfMonth.toISOString().split("T")[0]}&endDate=${endOfMonth.toISOString().split("T")[0]}`
        )
        const data = await res.json()
        if (data.success) {
          setSummary(data.data)
        }
      } catch (error) {
        console.error("Error fetching summary:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  const stats = summary
    ? [
        {
          title: "Total Buses",
          value: summary.counts.buses.toString(),
          icon: Bus,
          description: "Active vehicles",
          color: "text-blue-600",
          bgColor: "bg-blue-100",
        },
        {
          title: "Active Drivers",
          value: summary.counts.drivers.toString(),
          icon: Users,
          description: "Registered drivers",
          color: "text-green-600",
          bgColor: "bg-green-100",
        },
        {
          title: "Monthly Collections",
          value: formatCurrency(summary.collections.total),
          icon: DollarSign,
          description: `Avg: ${formatCurrency(summary.collections.average)}/day`,
          color: "text-emerald-600",
          bgColor: "bg-emerald-100",
        },
        {
          title: "Diesel Expenses",
          value: formatCurrency(summary.expenses.diesel),
          icon: Fuel,
          description: `${summary.expenses.dieselLiters.toFixed(1)} liters used`,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
        },
        {
          title: "Maintenance Costs",
          value: formatCurrency(summary.expenses.maintenance + summary.expenses.spareParts),
          icon: Wrench,
          description: `${summary.counts.maintenanceRecords} services`,
          color: "text-red-600",
          bgColor: "bg-red-100",
        },
        {
          title: "Net Income",
          value: formatCurrency(summary.netIncome),
          icon: TrendingUp,
          description: "After all expenses",
          color: summary.netIncome >= 0 ? "text-green-600" : "text-red-600",
          bgColor: summary.netIncome >= 0 ? "bg-green-100" : "bg-red-100",
        },
      ]
    : []

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Month indicator */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            {new Date().toLocaleDateString("en-PH", { month: "long", year: "numeric" })} Summary
          </span>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 rounded bg-muted"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-32 rounded bg-muted"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <a href="/dashboard/daily-records/new">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-primary" />
                  Add Daily Record
                </CardTitle>
                <CardDescription>Record today&apos;s collections and diesel</CardDescription>
              </CardHeader>
            </a>
          </Card>
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <a href="/dashboard/maintenance/new">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-5 w-5 text-primary" />
                  Log Maintenance
                </CardTitle>
                <CardDescription>Record service or repairs</CardDescription>
              </CardHeader>
            </a>
          </Card>
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <a href="/dashboard/spare-parts">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Spare Parts
                </CardTitle>
                <CardDescription>Track parts and expenses</CardDescription>
              </CardHeader>
            </a>
          </Card>
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <a href="/dashboard/reports">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  View Reports
                </CardTitle>
                <CardDescription>Analytics and summaries</CardDescription>
              </CardHeader>
            </a>
          </Card>
        </div>

        {/* Share Summary */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Assignee (Operator) Share</CardTitle>
                <CardDescription>Total paid to bus operators this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(summary.shares.assignee)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Driver Share</CardTitle>
                <CardDescription>Total paid to drivers this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(summary.shares.driver)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
