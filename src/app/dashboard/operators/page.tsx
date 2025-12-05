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
  HeaderFilter,
  Export,
  Format,
  MasterDetail,
} from "devextreme-react/data-grid"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, RefreshCw } from "lucide-react"
import "devextreme/dist/css/dx.light.css"

interface Bus {
  id: string
  busNumber: string
  plateNumber: string | null
  model: string | null
  isActive: boolean
}

interface Operator {
  id: string
  name: string
  contactNumber: string | null
  address: string | null
  sharePercent: number
  isActive: boolean
  buses?: Bus[]
}

function BusesDetail({ data }: { data: { data: Operator } }) {
  const buses = data.data.buses || []

  if (buses.length === 0) {
    return (
      <div className="p-4 text-muted-foreground">
        No buses assigned to this operator
      </div>
    )
  }

  return (
    <div className="p-4">
      <h4 className="mb-3 font-semibold">Assigned Buses</h4>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {buses.map((bus) => (
          <div
            key={bus.id}
            className="rounded-lg border bg-card p-3 text-sm"
          >
            <div className="font-medium">Bus #{bus.busNumber}</div>
            {bus.plateNumber && (
              <div className="text-muted-foreground">{bus.plateNumber}</div>
            )}
            {bus.model && (
              <div className="text-muted-foreground">{bus.model}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/operators?activeOnly=false&includeBuses=true")
      const data = await res.json()
      if (data.success) setOperators(data.data)
    } catch (error) {
      console.error("Error fetching operators:", error)
      toast.error("Failed to load operators")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRowInserted = async (e: { data: Partial<Operator> }) => {
    try {
      const res = await fetch("/api/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Operator added successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to add operator")
      }
    } catch {
      toast.error("Failed to add operator")
    }
  }

  const onRowUpdated = async (e: { key: string; data: Partial<Operator> }) => {
    try {
      const res = await fetch(`/api/operators/${e.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Operator updated successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to update operator")
      }
    } catch {
      toast.error("Failed to update operator")
    }
  }

  const onRowRemoved = async (e: { key: string }) => {
    try {
      const res = await fetch(`/api/operators/${e.key}`, {
        method: "DELETE",
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Operator deactivated successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to delete operator")
      }
    } catch {
      toast.error("Failed to delete operator")
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Operator (Assignee) Management" />
      <div className="flex-1 p-4 md:p-6">
        <DataGrid
          dataSource={operators}
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
              title: "Operator (Assignee) Information",
              showTitle: true,
              width: 500,
              height: 400,
            }}
          />

          <MasterDetail
            enabled={true}
            component={BusesDetail}
          />

          <Toolbar>
            <Item location="before">
              <div className="text-lg font-semibold">Operators / Assignees</div>
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
                Add Operator
              </Button>
            </Item>
            <Item name="searchPanel" />
            <Item name="exportButton" />
          </Toolbar>

          <Column dataField="name" caption="Name">
            <HeaderFilter allowSearch={true} />
          </Column>
          <Column dataField="contactNumber" caption="Contact" width={130} />
          <Column dataField="address" caption="Address" />
          <Column dataField="sharePercent" caption="Share %" dataType="number" width={100}>
            <Format type="fixedPoint" precision={2} />
          </Column>
          <Column
            caption="Buses"
            width={80}
            allowFiltering={false}
            allowSorting={false}
            cellRender={(data) => (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                {data.data.buses?.length || 0}
              </span>
            )}
          />
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
