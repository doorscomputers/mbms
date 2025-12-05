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

  return (
    <div className="flex flex-col">
      <Header title="Driver Management" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-4 flex gap-2">
          <Link href="/dashboard/drivers/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

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
          className="shadow-sm"
        >
          <FilterRow visible={true} />
          <HeaderFilter visible={true} />
          <SearchPanel visible={true} width={240} placeholder="Search..." />
          <Paging defaultPageSize={20} />
          <Export enabled={true} allowExportSelectedData={true} />

          <Toolbar>
            <Item location="before">
              <div className="text-lg font-semibold">Drivers</div>
            </Item>
            <Item name="searchPanel" />
            <Item name="exportButton" />
          </Toolbar>

          <Column
            caption="Actions"
            width={80}
            cellRender={(data) => (
              <Link href={`/dashboard/drivers/${data.data.id}/edit`}>
                <Button variant="ghost" size="sm">
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
            )}
          />
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
