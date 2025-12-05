"use client"

import { devExtremeLicenseKey } from "@/lib/devextreme-license"
void devExtremeLicenseKey
import { useEffect, useState, useCallback } from "react"
import DataGrid, {
  Column,
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
import { Plus, RefreshCw, Pencil } from "lucide-react"
import Link from "next/link"
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

  return (
    <div className="flex flex-col">
      <Header title="Bus Management" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-4 flex gap-2">
          <Link href="/dashboard/buses/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Bus
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <DataGrid
          dataSource={buses}
          keyExpr="id"
          showBorders={true}
          showRowLines={true}
          showColumnLines={false}
          rowAlternationEnabled={true}
          allowColumnReordering={true}
          allowColumnResizing={true}
          columnAutoWidth={true}
          className="shadow-sm"
        >
          <FilterRow visible={true} />
          <HeaderFilter visible={true} />
          <SearchPanel visible={true} width={240} placeholder="Search..." />
          <Paging defaultPageSize={20} />
          <Export enabled={true} allowExportSelectedData={true} />

          <Toolbar>
            <Item location="before">
              <div className="text-lg font-semibold">Buses</div>
            </Item>
            <Item name="searchPanel" />
            <Item name="exportButton" />
          </Toolbar>

          <Column
            caption="Actions"
            width={80}
            cellRender={(data) => (
              <Link href={`/dashboard/buses/${data.data.id}/edit`}>
                <Button variant="ghost" size="sm">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
            )}
          />
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
