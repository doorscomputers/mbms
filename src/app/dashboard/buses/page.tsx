"use client"

import { devExtremeLicenseKey } from "@/lib/devextreme-license"
void devExtremeLicenseKey // Ensure license module executes
import { useEffect, useState, useCallback, useRef } from "react"
import DataGrid, {
  DataGridTypes,
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
} from "devextreme-react/data-grid"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, RefreshCw } from "lucide-react"
import "devextreme/dist/css/dx.light.css"

interface Operator {
  id: string
  name: string
}

interface Bus {
  id: string
  busNumber: string
  plateNumber: string | null
  model: string | null
  capacity: number | null
  operatorId: string | null
  operator?: Operator
  isActive: boolean
}

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataGridRef = useRef<any>(null)

  const handleAddClick = () => {
    dataGridRef.current?.instance()?.addRow()
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [busesRes, operatorsRes] = await Promise.all([
        fetch("/api/buses?includeOperator=true&activeOnly=false"),
        fetch("/api/operators"),
      ])

      const busesData = await busesRes.json()
      const operatorsData = await operatorsRes.json()

      if (busesData.success) setBuses(busesData.data)
      if (operatorsData.success) setOperators(operatorsData.data)
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

  const onRowInserted = async (e: { data: Partial<Bus> }) => {
    try {
      const res = await fetch("/api/buses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Bus added successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to add bus")
      }
    } catch {
      toast.error("Failed to add bus")
    }
  }

  const onRowUpdated = async (e: { key: string; data: Partial<Bus> }) => {
    try {
      const res = await fetch(`/api/buses/${e.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Bus updated successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to update bus")
      }
    } catch {
      toast.error("Failed to update bus")
    }
  }

  const onRowRemoved = async (e: { key: string }) => {
    try {
      const res = await fetch(`/api/buses/${e.key}`, {
        method: "DELETE",
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Bus deactivated successfully")
        fetchData()
      } else {
        toast.error(result.error || "Failed to delete bus")
      }
    } catch {
      toast.error("Failed to delete bus")
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Bus Management" />
      <div className="flex-1 p-4 md:p-6">
        <DataGrid
          ref={dataGridRef}
          dataSource={buses}
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
              title: "Bus Information",
              showTitle: true,
              width: 500,
              height: 400,
            }}
          />

          <Toolbar>
            <Item location="before">
              <div className="text-lg font-semibold">Buses</div>
            </Item>
            <Item location="after">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </Item>
            <Item location="after">
              <Button size="sm" onClick={handleAddClick}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bus
              </Button>
            </Item>
            <Item name="searchPanel" />
            <Item name="exportButton" />
          </Toolbar>

          <Column dataField="busNumber" caption="Bus No." width={100}>
            <HeaderFilter allowSearch={true} />
          </Column>
          <Column dataField="plateNumber" caption="Plate Number" width={120} />
          <Column dataField="model" caption="Model" />
          <Column dataField="capacity" caption="Capacity" dataType="number" width={80} />
          <Column dataField="operatorId" caption="Operator">
            <Lookup
              dataSource={operators}
              valueExpr="id"
              displayExpr="name"
            />
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
