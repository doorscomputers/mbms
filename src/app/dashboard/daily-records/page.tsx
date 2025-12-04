"use client"

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
import { Plus, RefreshCw, Calendar } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/types"
import Link from "next/link"
import "devextreme/dist/css/dx.light.css"

interface Bus {
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
  bus: Bus
  driver: Driver
}

export default function DailyRecordsPage() {
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [buses, setBuses] = useState<Bus[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="flex flex-col">
      <Header title="Daily Records" />
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
      </div>
    </div>
  )
}
