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
  Format,
} from "devextreme-react/data-grid"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, RefreshCw, Calendar, Bus, User, Fuel } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/types"
import Link from "next/link"
import { useIsMobile } from "@/hooks/use-mobile"
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

export default function DailyRecordsPage() {
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [buses, setBuses] = useState<BusData[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recordsRes, busesRes, driversRes] = await Promise.all([
        fetch("/api/daily-records?limit=100"),
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

  // Calculate totals for mobile summary
  const totals = records.reduce(
    (acc, record) => ({
      collection: acc.collection + record.totalCollection,
      diesel: acc.diesel + record.dieselCost,
      assigneeShare: acc.assigneeShare + record.assigneeShare,
      driverShare: acc.driverShare + record.driverShare,
    }),
    { collection: 0, diesel: 0, assigneeShare: 0, driverShare: 0 }
  )

  return (
    <div className="flex flex-col">
      <Header title="Daily Records" />
      <div className="flex-1 p-4 md:p-6">
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
              {records.map((record) => (
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
              {records.length === 0 && !loading && (
                <div className="p-8 text-center text-muted-foreground">
                  No records found
                </div>
              )}
            </div>
          </div>
        ) : (
          // Desktop DataGrid View
          <DataGrid
          dataSource={records}
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
          <Column dataField="totalCollection" caption="Collection" dataType="number" width={120}>
            <Format type="currency" precision={2} />
          </Column>
          <Column dataField="dieselCost" caption="Diesel Cost" dataType="number" width={110}>
            <Format type="currency" precision={2} />
          </Column>
          <Column dataField="dieselLiters" caption="Liters" dataType="number" width={80}>
            <Format type="fixedPoint" precision={2} />
          </Column>
          <Column dataField="coopContribution" caption="Coop" dataType="number" width={100}>
            <Format type="currency" precision={2} />
          </Column>
          <Column
            dataField="assigneeShare"
            caption="Assignee Share"
            dataType="number"
            width={120}
            allowEditing={false}
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
            allowEditing={false}
            cellRender={(data) => (
              <span className="text-green-600 font-medium">
                {formatCurrency(data.value || 0)}
              </span>
            )}
          />
          <Column dataField="tripCount" caption="Trips" dataType="number" width={70} />
          <Column dataField="minimumCollection" caption="Min Collection" dataType="number" visible={false}>
            <Format type="currency" precision={2} />
          </Column>
          <Column dataField="otherExpenses" caption="Other Exp." dataType="number" visible={false}>
            <Format type="currency" precision={2} />
          </Column>
          <Column dataField="notes" caption="Notes" visible={false} />

          <Summary>
            <TotalItem
              column="totalCollection"
              summaryType="sum"
              valueFormat={{ type: "currency", precision: 2 }}
              displayFormat="Total: {0}"
            />
            <TotalItem
              column="dieselCost"
              summaryType="sum"
              valueFormat={{ type: "currency", precision: 2 }}
              displayFormat="Total: {0}"
            />
            <TotalItem
              column="assigneeShare"
              summaryType="sum"
              valueFormat={{ type: "currency", precision: 2 }}
              displayFormat="Total: {0}"
            />
            <TotalItem
              column="driverShare"
              summaryType="sum"
              valueFormat={{ type: "currency", precision: 2 }}
              displayFormat="Total: {0}"
            />
          </Summary>
        </DataGrid>
        )}
      </div>
    </div>
  )
}
