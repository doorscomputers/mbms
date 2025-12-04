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
  HeaderFilter,
  Export,
  Format,
} from "devextreme-react/data-grid"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, RefreshCw } from "lucide-react"
import "devextreme/dist/css/dx.light.css"

interface Driver {
  id: string
  name: string
  licenseNumber: string | null
  contactNumber: string | null
  address: string | null
  sharePercent: number
  isActive: boolean
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/drivers?activeOnly=false")
      const data = await res.json()
      if (data.success) setDrivers(data.data)
    } catch (error) {
      console.error("Error fetching drivers:", error)
      toast.error("Failed to load drivers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRowInserted = async (e: { data: Partial<Driver> }) => {
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Driver added successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to add driver")
      }
    } catch {
      toast.error("Failed to add driver")
    }
  }

  const onRowUpdated = async (e: { key: string; data: Partial<Driver> }) => {
    try {
      const res = await fetch(`/api/drivers/${e.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Driver updated successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to update driver")
      }
    } catch {
      toast.error("Failed to update driver")
    }
  }

  const onRowRemoved = async (e: { key: string }) => {
    try {
      const res = await fetch(`/api/drivers/${e.key}`, {
        method: "DELETE",
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Driver deactivated successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to delete driver")
      }
    } catch {
      toast.error("Failed to delete driver")
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Driver Management" />
      <div className="flex-1 p-4 md:p-6">
        <DataGrid
          dataSource={drivers}
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
          <Paging defaultPageSize={20} />
          <Export enabled={true} allowExportSelectedData={true} />

          <Editing
            mode="popup"
            allowAdding={true}
            allowUpdating={true}
            allowDeleting={true}
            useIcons={true}
            popup={{
              title: "Driver Information",
              showTitle: true,
              width: 500,
              height: 450,
            }}
          />

          <Toolbar>
            <Item location="before">
              <div className="text-lg font-semibold">Drivers</div>
            </Item>
            <Item location="after">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </Item>
            <Item name="addRowButton" showText="always">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </Item>
            <Item name="searchPanel" />
            <Item name="exportButton" />
          </Toolbar>

          <Column dataField="name" caption="Full Name">
            <HeaderFilter allowSearch={true} />
          </Column>
          <Column dataField="licenseNumber" caption="License No." width={140} />
          <Column dataField="contactNumber" caption="Contact" width={130} />
          <Column dataField="address" caption="Address" />
          <Column dataField="sharePercent" caption="Share %" dataType="number" width={100}>
            <Format type="fixedPoint" precision={2} />
          </Column>
          <Column
            dataField="isActive"
            caption="Status"
            dataType="boolean"
            width={80}
            cellRender={(data) => (
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  data.value
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {data.value ? "Active" : "Inactive"}
              </span>
            )}
          />
        </DataGrid>
      </div>
    </div>
  )
}
