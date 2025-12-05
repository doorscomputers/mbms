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
  HeaderFilter,
  Export,
  Format,
} from "devextreme-react/data-grid"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, RefreshCw, Pencil } from "lucide-react"
import Link from "next/link"
import "devextreme/dist/css/dx.light.css"

interface Bus {
  id: string
  busNumber: string
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

  return (
    <div className="flex flex-col">
      <Header title="Operator (Assignee) Management" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-4 flex gap-2">
          <Link href="/dashboard/operators/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Operator
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

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
          className="shadow-sm"
        >
          <FilterRow visible={true} />
          <HeaderFilter visible={true} />
          <SearchPanel visible={true} width={240} placeholder="Search..." />
          <Paging defaultPageSize={20} />
          <Export enabled={true} allowExportSelectedData={true} />

          <Toolbar>
            <Item location="before">
              <div className="text-lg font-semibold">Operators / Assignees</div>
            </Item>
            <Item name="searchPanel" />
            <Item name="exportButton" />
          </Toolbar>

          <Column
            caption="Actions"
            width={80}
            cellRender={(data) => (
              <Link href={`/dashboard/operators/${data.data.id}/edit`}>
                <Button variant="ghost" size="sm">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
            )}
          />
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
