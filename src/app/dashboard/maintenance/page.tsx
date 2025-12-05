"use client"

import "@/lib/devextreme-license"
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
  GroupPanel,
  Grouping,
} from "devextreme-react/data-grid"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, RefreshCw } from "lucide-react"
import { formatCurrency, formatDate, MAINTENANCE_TYPE_LABELS } from "@/lib/types"
import Link from "next/link"
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
  cost: number
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

  return (
    <div className="flex flex-col">
      <Header title="Maintenance Records" />
      <div className="flex-1 p-4 md:p-6">
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
          <Column dataField="cost" caption="Cost" dataType="number" width={120}>
            <Format type="currency" precision={2} />
          </Column>
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
              column="cost"
              summaryType="sum"
              valueFormat={{ type: "currency", precision: 2 }}
              displayFormat="Total: {0}"
            />
            <TotalItem
              column="id"
              summaryType="count"
              displayFormat="Records: {0}"
            />
          </Summary>
        </DataGrid>
      </div>
    </div>
  )
}
