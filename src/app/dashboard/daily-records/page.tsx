"use client"

import { devExtremeLicenseKey } from "@/lib/devextreme-license"
void devExtremeLicenseKey // Ensure license module executes
import { useEffect, useState, useCallback } from "react"
import DataGrid, {
  Column,
  Editing,
  Paging,
  FilterRow,
  SearchPanel,
  Toolbar,
  Item,
  Lookup,
  HeaderFilter,
  Export,
  Summary,
  TotalItem,
} from "devextreme-react/data-grid"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, RefreshCw, Calendar, Bus, User, Fuel, Filter } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/types"
import Link from "next/link"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import "devextreme/dist/css/dx.light.css"

interface BusData {
  id: string
  busNumber: string
  operator?: { name: string }
}

interface Driver {
  id: string
  name: string
}

interface DailyRecord {
  id: string
  date: string
  busId: string
  driverId: string
  totalCollection: number
  passengerCount: number
  tripCount: number
  dieselLiters: number
  dieselCost: number
  minimumCollection: number
  coopContribution: number
  assigneeShare: number
  driverShare: number
  excessCollection: number
  otherExpenses: number
  notes: string | null
  bus: BusData
  driver: Driver
}

type DateFilterOption =
  | "all"
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom"

function getDateRange(option: DateFilterOption): { startDate: string | null; endDate: string | null } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (option) {
    case "all":
      return { startDate: null, endDate: null }

    case "today":
      return {
        startDate: today.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }

    case "yesterday": {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        startDate: yesterday.toISOString().split("T")[0],
        endDate: yesterday.toISOString().split("T")[0],
      }
    }

    case "this_week": {
      const startOfWeek = new Date(today)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Monday
      startOfWeek.setDate(diff)
      return {
        startDate: startOfWeek.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }
    }

    case "last_week": {
      const startOfLastWeek = new Date(today)
      const day = startOfLastWeek.getDay()
      const diff = startOfLastWeek.getDate() - day + (day === 0 ? -6 : 1) - 7
      startOfLastWeek.setDate(diff)
      const endOfLastWeek = new Date(startOfLastWeek)
      endOfLastWeek.setDate(endOfLastWeek.getDate() + 6)
      return {
        startDate: startOfLastWeek.toISOString().split("T")[0],
        endDate: endOfLastWeek.toISOString().split("T")[0],
      }
    }

    case "this_month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return {
        startDate: startOfMonth.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }
    }

    case "last_month": {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        startDate: startOfLastMonth.toISOString().split("T")[0],
        endDate: endOfLastMonth.toISOString().split("T")[0],
      }
    }

    case "this_quarter": {
      const quarter = Math.floor(now.getMonth() / 3)
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1)
      return {
        startDate: startOfQuarter.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }
    }

    case "last_quarter": {
      const quarter = Math.floor(now.getMonth() / 3)
      const startOfLastQuarter = new Date(now.getFullYear(), (quarter - 1) * 3, 1)
      const endOfLastQuarter = new Date(now.getFullYear(), quarter * 3, 0)
      return {
        startDate: startOfLastQuarter.toISOString().split("T")[0],
        endDate: endOfLastQuarter.toISOString().split("T")[0],
      }
    }

    case "this_year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      return {
        startDate: startOfYear.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }
    }

    case "last_year": {
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1)
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31)
      return {
        startDate: startOfLastYear.toISOString().split("T")[0],
        endDate: endOfLastYear.toISOString().split("T")[0],
      }
    }

    default:
      return { startDate: null, endDate: null }
  }
}

export default function DailyRecordsPage() {
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<DailyRecord[]>([])
  const [buses, setBuses] = useState<BusData[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  // Date filter states
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("this_month")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recordsRes, busesRes, driversRes] = await Promise.all([
        fetch("/api/daily-records?limit=500"),
        fetch("/api/buses?includeOperator=true"),
        fetch("/api/drivers"),
      ])

      const recordsData = await recordsRes.json()
      const busesData = await busesRes.json()
      const driversData = await driversRes.json()

      if (recordsData.success) setRecords(recordsData.data)
      if (busesData.success) setBuses(busesData.data)
      if (driversData.success) setDrivers(driversData.data)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Apply date filter
  useEffect(() => {
    let startDate: string | null = null
    let endDate: string | null = null

    if (dateFilter === "custom") {
      startDate = customStartDate || null
      endDate = customEndDate || null
    } else {
      const range = getDateRange(dateFilter)
      startDate = range.startDate
      endDate = range.endDate
    }

    if (!startDate && !endDate) {
      setFilteredRecords(records)
    } else {
      const filtered = records.filter((record) => {
        const recordDate = record.date.split("T")[0]
        if (startDate && recordDate < startDate) return false
        if (endDate && recordDate > endDate) return false
        return true
      })
      setFilteredRecords(filtered)
    }
  }, [records, dateFilter, customStartDate, customEndDate])

  const onRowInserted = async (e: { data: Partial<DailyRecord> }) => {
    try {
      const res = await fetch("/api/daily-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Record added successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to add record")
      }
    } catch {
      toast.error("Failed to add record")
    }
  }

  const onRowUpdated = async (e: { key: string; data: Partial<DailyRecord> }) => {
    try {
      // Merge with existing data
      const existingRecord = records.find((r) => r.id === e.key)
      const mergedData = { ...existingRecord, ...e.data }

      const res = await fetch(`/api/daily-records/${e.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedData),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Record updated successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to update record")
      }
    } catch {
      toast.error("Failed to update record")
    }
  }

  const onRowRemoved = async (e: { key: string }) => {
    try {
      const res = await fetch(`/api/daily-records/${e.key}`, {
        method: "DELETE",
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Record deleted successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to delete record")
      }
    } catch {
      toast.error("Failed to delete record")
    }
  }

  // Calculate totals for filtered records
  const totals = filteredRecords.reduce(
    (acc, record) => ({
      collection: acc.collection + record.totalCollection,
      diesel: acc.diesel + record.dieselCost,
      assigneeShare: acc.assigneeShare + record.assigneeShare,
      driverShare: acc.driverShare + record.driverShare,
    }),
    { collection: 0, diesel: 0, assigneeShare: 0, driverShare: 0 }
  )

  // Date filter label
  const getDateFilterLabel = () => {
    if (dateFilter === "custom" && customStartDate && customEndDate) {
      return `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`
    }
    if (dateFilter === "custom") return "Custom Range"

    const range = getDateRange(dateFilter)
    if (!range.startDate) return "All Records"
    if (range.startDate === range.endDate) return formatDate(range.startDate)
    return `${formatDate(range.startDate)} - ${formatDate(range.endDate || range.startDate)}`
  }

  return (
    <div className="flex flex-col">
      <Header title="Daily Records" />
      <div className="flex-1 p-4 md:p-6">
        {/* Date Filter Section */}
        <div className="mb-4 p-4 bg-muted/30 rounded-lg border">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" />
                Date Filter
              </Label>
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilterOption)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="last_quarter">Last Quarter</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === "custom" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
              </>
            )}

            <div className="flex-1 text-right text-sm text-muted-foreground">
              <span className="font-medium">{filteredRecords.length}</span> records | {getDateFilterLabel()}
            </div>
          </div>
        </div>

        {isMobile ? (
          // Mobile Card View
          <div className="space-y-4">
            {/* Mobile Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Daily Collections</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Link href="/dashboard/daily-records/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Summary Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-xs text-emerald-600">Total Collection</div>
                <div className="text-sm font-bold text-emerald-700">{formatCurrency(totals.collection)}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-xs text-orange-600">Diesel Cost</div>
                <div className="text-sm font-bold text-orange-700">{formatCurrency(totals.diesel)}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600">Operator Share</div>
                <div className="text-sm font-bold text-blue-700">{formatCurrency(totals.assigneeShare)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600">Driver Share</div>
                <div className="text-sm font-bold text-green-700">{formatCurrency(totals.driverShare)}</div>
              </div>
            </div>

            {/* Mobile Record Cards */}
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <div key={record.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatDate(record.date)}</span>
                    </div>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatCurrency(record.totalCollection)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Bus className="h-4 w-4 text-primary" />
                      <span className="font-medium">{record.bus?.busNumber}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4 text-green-600" />
                      <span>{record.driver?.name}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Fuel className="h-4 w-4 text-orange-500" />
                      <span className="text-muted-foreground">Diesel:</span>
                      <span className="font-medium">{formatCurrency(record.dieselCost)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Liters:</span>
                      <span className="ml-1 font-medium">{record.dieselLiters.toFixed(1)}L</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Operator:</span>
                      <span className="ml-1 font-medium text-blue-600">{formatCurrency(record.assigneeShare)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Driver:</span>
                      <span className="ml-1 font-medium text-green-600">{formatCurrency(record.driverShare)}</span>
                    </div>
                  </div>

                  {record.tripCount > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Trips:</span>
                      <span className="ml-1 font-medium">{record.tripCount}</span>
                    </div>
                  )}
                </div>
              ))}
              {filteredRecords.length === 0 && !loading && (
                <div className="p-8 text-center text-muted-foreground">
                  No records found for the selected period
                </div>
              )}
            </div>
          </div>
        ) : (
          // Desktop DataGrid View
          <DataGrid
          dataSource={filteredRecords}
          keyExpr="id"
          showBorders={true}
          showRowLines={true}
          showColumnLines={false}
          rowAlternationEnabled={true}
          allowColumnReordering={true}
          allowColumnResizing={true}
          columnAutoWidth={true}
          onRowInserted={onRowInserted}
          onRowUpdated={onRowUpdated}
          onRowRemoved={onRowRemoved}
          className="shadow-sm"
          wordWrapEnabled={true}
        >
          <FilterRow visible={true} />
          <HeaderFilter visible={true} />
          <SearchPanel visible={true} width={240} placeholder="Search..." />
          <Paging defaultPageSize={20} />
          <Export enabled={true} allowExportSelectedData={true} />

          <Editing
            mode="popup"
            allowAdding={true}
            allowUpdating={true}
            allowDeleting={true}
            useIcons={true}
            popup={{
              title: "Daily Record",
              showTitle: true,
              width: 700,
              height: 600,
            }}
          />

          <Toolbar>
            <Item location="before">
              <div className="text-lg font-semibold">Daily Collections & Diesel</div>
            </Item>
            <Item location="after">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </Item>
            <Item location="after">
              <Link href="/dashboard/daily-records/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Record
                </Button>
              </Link>
            </Item>
            <Item name="searchPanel" />
            <Item name="exportButton" />
          </Toolbar>

          <Column
            dataField="date"
            caption="Date"
            dataType="date"
            width={110}
            sortOrder="desc"
            cellRender={(data) => formatDate(data.value)}
          />
          <Column dataField="busId" caption="Bus" width={100}>
            <Lookup
              dataSource={buses}
              valueExpr="id"
              displayExpr="busNumber"
            />
          </Column>
          <Column dataField="driverId" caption="Driver">
            <Lookup
              dataSource={drivers}
              valueExpr="id"
              displayExpr="name"
            />
          </Column>
          <Column
            dataField="totalCollection"
            caption="Collection"
            dataType="number"
            width={120}
            cellRender={(data) => (
              <span className="font-medium">{formatCurrency(data.value || 0)}</span>
            )}
          />
          <Column
            dataField="dieselCost"
            caption="Diesel Cost"
            dataType="number"
            width={110}
            cellRender={(data) => (
              <span className="text-orange-600">{formatCurrency(data.value || 0)}</span>
            )}
          />
          <Column dataField="dieselLiters" caption="Liters" dataType="number" width={80} format="#,##0.00" />
          <Column
            dataField="coopContribution"
            caption="Coop"
            dataType="number"
            width={100}
            cellRender={(data) => formatCurrency(data.value || 0)}
          />
          <Column
            dataField="assigneeShare"
            caption="Assignee Share"
            dataType="number"
            width={120}
            cellRender={(data) => (
              <span className="text-blue-600 font-medium">
                {formatCurrency(data.value || 0)}
              </span>
            )}
          />
          <Column
            dataField="driverShare"
            caption="Driver Share"
            dataType="number"
            width={110}
            cellRender={(data) => (
              <span className="text-green-600 font-medium">
                {formatCurrency(data.value || 0)}
              </span>
            )}
          />
          <Column dataField="tripCount" caption="Trips" dataType="number" width={70} />
          <Column
            dataField="minimumCollection"
            caption="Min Collection"
            dataType="number"
            visible={false}
            cellRender={(data) => formatCurrency(data.value || 0)}
          />
          <Column
            dataField="otherExpenses"
            caption="Other Exp."
            dataType="number"
            visible={false}
            cellRender={(data) => formatCurrency(data.value || 0)}
          />
          <Column dataField="notes" caption="Notes" visible={false} />

          <Summary>
            <TotalItem
              column="totalCollection"
              summaryType="sum"
              customizeText={(data) => `Total: ${formatCurrency(Number(data.value) || 0)}`}
            />
            <TotalItem
              column="dieselCost"
              summaryType="sum"
              customizeText={(data) => `Total: ${formatCurrency(Number(data.value) || 0)}`}
            />
            <TotalItem
              column="assigneeShare"
              summaryType="sum"
              customizeText={(data) => `Total: ${formatCurrency(Number(data.value) || 0)}`}
            />
            <TotalItem
              column="driverShare"
              summaryType="sum"
              customizeText={(data) => `Total: ${formatCurrency(Number(data.value) || 0)}`}
            />
          </Summary>
        </DataGrid>
        )}
      </div>
    </div>
  )
}
