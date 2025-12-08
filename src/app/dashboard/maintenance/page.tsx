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
  GroupPanel,
  Grouping,
} from "devextreme-react/data-grid"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, RefreshCw, Wrench, Calendar, Bus as BusIcon, Loader2 } from "lucide-react"
import { formatCurrency, formatDate, MAINTENANCE_TYPE_LABELS } from "@/lib/types"
import Link from "next/link"
import { useIsMobile } from "@/hooks/use-mobile"
import "devextreme/dist/css/dx.light.css"

interface Bus {
  id: string
  busNumber: string
  operator?: { name: string }
}

interface MaintenanceRecord {
  id: string
  busId: string
  date: string
  maintenanceType: string
  description: string | null
  totalCost: number | string
  sparePartsCost: number | string
  laborCost: number | string
  miscellaneousCost: number | string
  odometerReading: number | null
  serviceProvider: string | null
  nextServiceDate: string | null
  nextServiceOdometer: number | null
  notes: string | null
  bus: Bus
}

const maintenanceTypes = Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, text]) => ({
  value,
  text,
}))

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [buses, setBuses] = useState<Bus[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recordsRes, busesRes] = await Promise.all([
        fetch("/api/maintenance?limit=200"),
        fetch("/api/buses?includeOperator=true"),
      ])

      const recordsData = await recordsRes.json()
      const busesData = await busesRes.json()

      if (recordsData.success) setRecords(recordsData.data)
      if (busesData.success) setBuses(busesData.data)
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

  const onRowInserted = async (e: { data: Partial<MaintenanceRecord> }) => {
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Maintenance record added")
        fetchData()
      } else {
        toast.error(result.error || "Failed to add record")
      }
    } catch {
      toast.error("Failed to add record")
    }
  }

  const onRowUpdated = async (e: { key: string; data: Partial<MaintenanceRecord> }) => {
    try {
      const existingRecord = records.find((r) => r.id === e.key)
      const mergedData = { ...existingRecord, ...e.data }

      const res = await fetch(`/api/maintenance/${e.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedData),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Record updated")
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
      const res = await fetch(`/api/maintenance/${e.key}`, {
        method: "DELETE",
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Record deleted")
        fetchData()
      } else {
        toast.error(result.error || "Failed to delete record")
      }
    } catch {
      toast.error("Failed to delete record")
    }
  }

  // Calculate total maintenance cost
  const totalCost = records.reduce((acc, record) => {
    const cost = typeof record.totalCost === 'string' ? parseFloat(record.totalCost) : (record.totalCost || 0)
    return acc + cost
  }, 0)

  return (
    <div className="flex flex-col">
      <Header title="Maintenance Records" />
      <div className="flex-1 p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading maintenance records...</p>
            </div>
          </div>
        ) : isMobile ? (
          // Mobile Card View
          <div className="space-y-4">
            {/* Mobile Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Maintenance History</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Link href="/dashboard/maintenance/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Summary */}
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-red-600">Total Maintenance Cost</div>
                  <div className="text-xl font-bold text-red-700">{formatCurrency(totalCost)}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {records.length} records
                </div>
              </div>
            </div>

            {/* Mobile Record Cards */}
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-red-500" />
                      <span className="font-medium">
                        {MAINTENANCE_TYPE_LABELS[record.maintenanceType as keyof typeof MAINTENANCE_TYPE_LABELS] || record.maintenanceType}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-red-600">
                      {formatCurrency(record.totalCost)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(record.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BusIcon className="h-4 w-4 text-primary" />
                      <span className="font-medium">{record.bus?.busNumber}</span>
                    </div>
                  </div>

                  {record.description && (
                    <div className="text-sm text-muted-foreground">
                      {record.description}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                    {record.serviceProvider && (
                      <div>
                        <span className="text-muted-foreground">Provider:</span>
                        <span className="ml-1 font-medium">{record.serviceProvider}</span>
                      </div>
                    )}
                    {record.odometerReading && (
                      <div>
                        <span className="text-muted-foreground">Odometer:</span>
                        <span className="ml-1 font-medium">{record.odometerReading.toLocaleString()} km</span>
                      </div>
                    )}
                    {record.nextServiceDate && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Next Service:</span>
                        <span className={`ml-1 font-medium ${new Date(record.nextServiceDate) < new Date() ? "text-red-600" : ""}`}>
                          {formatDate(record.nextServiceDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {records.length === 0 && !loading && (
                <div className="p-8 text-center text-muted-foreground">
                  No maintenance records found
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
        >
          <FilterRow visible={true} />
          <HeaderFilter visible={true} />
          <SearchPanel visible={true} width={240} placeholder="Search..." />
          <GroupPanel visible={true} />
          <Grouping autoExpandAll={false} />
          <Paging defaultPageSize={20} />
          <Export enabled={true} allowExportSelectedData={true} />

          <Editing
            mode="popup"
            allowAdding={true}
            allowUpdating={true}
            allowDeleting={true}
            useIcons={true}
            popup={{
              title: "Maintenance Record",
              showTitle: true,
              width: 600,
              height: 550,
            }}
          />

          <Toolbar>
            <Item location="before">
              <div className="text-lg font-semibold">Maintenance History</div>
            </Item>
            <Item location="after">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </Item>
            <Item location="after">
              <Link href="/dashboard/maintenance/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Maintenance
                </Button>
              </Link>
            </Item>
            <Item name="groupPanel" />
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
          <Column dataField="busId" caption="Bus" width={100} groupIndex={0}>
            <Lookup dataSource={buses} valueExpr="id" displayExpr="busNumber" />
          </Column>
          <Column dataField="maintenanceType" caption="Type" width={150}>
            <Lookup dataSource={maintenanceTypes} valueExpr="value" displayExpr="text" />
          </Column>
          <Column dataField="description" caption="Description" />
          <Column
            dataField="totalCost"
            caption="Cost"
            dataType="number"
            width={120}
            cellRender={(data) => formatCurrency(data.value || 0)}
          />
          <Column dataField="odometerReading" caption="Odometer" dataType="number" width={100} />
          <Column dataField="serviceProvider" caption="Service Provider" width={150} />
          <Column
            dataField="nextServiceDate"
            caption="Next Service"
            dataType="date"
            width={110}
            cellRender={(data) => {
              if (!data.value) return "-"
              const date = new Date(data.value)
              const isOverdue = date < new Date()
              return (
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                  {formatDate(data.value)}
                </span>
              )
            }}
          />
          <Column dataField="notes" caption="Notes" visible={false} />

          <Summary>
            <TotalItem
              column="totalCost"
              summaryType="sum"
              customizeText={(data) => {
                const value = typeof data.value === 'number' ? data.value : 0
                return `Total: ${formatCurrency(value)}`
              }}
            />
            <TotalItem
              column="id"
              summaryType="count"
              displayFormat="Records: {0}"
            />
          </Summary>
        </DataGrid>
        )}
      </div>
    </div>
  )
}
