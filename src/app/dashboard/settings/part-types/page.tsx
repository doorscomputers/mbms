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
  Sorting,
} from "devextreme-react/data-grid"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { ArrowLeft, Plus, RefreshCw } from "lucide-react"
import Link from "next/link"
import "devextreme/dist/css/dx.light.css"

interface PartType {
  id: string
  code: string
  label: string
  description: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export default function PartTypesPage() {
  const [partTypes, setPartTypes] = useState<PartType[]>([])
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataGridRef = useRef<any>(null)

  const handleAddClick = () => {
    dataGridRef.current?.instance()?.addRow()
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all part types including inactive ones
      const res = await fetch("/api/part-types?activeOnly=false&seedIfEmpty=true")
      const data = await res.json()
      if (data.success) setPartTypes(data.data)
    } catch (error) {
      console.error("Error fetching part types:", error)
      toast.error("Failed to load part types")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRowInserted = async (e: { data: Partial<PartType> }) => {
    try {
      const res = await fetch("/api/part-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Part type added")
        fetchData()
      } else {
        toast.error(result.error || "Failed to add part type")
      }
    } catch {
      toast.error("Failed to add part type")
    }
  }

  const onRowUpdated = async (e: { key: string; data: Partial<PartType> }) => {
    try {
      const existingType = partTypes.find((pt) => pt.id === e.key)
      const mergedData = { ...existingType, ...e.data }

      const res = await fetch(`/api/part-types/${e.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedData),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Part type updated")
        fetchData()
      } else {
        toast.error(result.error || "Failed to update part type")
      }
    } catch {
      toast.error("Failed to update part type")
    }
  }

  const onRowRemoved = async (e: { key: string }) => {
    try {
      const res = await fetch(`/api/part-types/${e.key}`, {
        method: "DELETE",
      })
      const result = await res.json()
      if (result.success) {
        toast.success(result.message || "Part type deleted")
        fetchData()
      } else {
        toast.error(result.error || "Failed to delete part type")
      }
    } catch {
      toast.error("Failed to delete part type")
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Part Type Settings" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-6">
          <Link href="/dashboard/spare-parts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Spare Parts
            </Button>
          </Link>
        </div>

        <DataGrid
          ref={dataGridRef}
          dataSource={partTypes}
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
          <SearchPanel visible={true} width={240} placeholder="Search..." />
          <Paging defaultPageSize={50} />
          <Sorting mode="multiple" />

          <Editing
            mode="popup"
            allowAdding={true}
            allowUpdating={true}
            allowDeleting={true}
            useIcons={true}
            popup={{
              title: "Part Type",
              showTitle: true,
              width: 500,
              height: 400,
            }}
          />

          <Toolbar>
            <Item location="before">
              <div className="text-lg font-semibold">Manage Part Types</div>
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
                Add Part Type
              </Button>
            </Item>
            <Item name="searchPanel" />
          </Toolbar>

          <Column
            dataField="sortOrder"
            caption="Order"
            dataType="number"
            width={70}
            sortOrder="asc"
          />
          <Column dataField="code" caption="Code" width={150} />
          <Column dataField="label" caption="Label" />
          <Column dataField="description" caption="Description" />
          <Column
            dataField="isActive"
            caption="Active"
            dataType="boolean"
            width={80}
            cellRender={(data) => (
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  data.value
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {data.value ? "Yes" : "No"}
              </span>
            )}
          />
        </DataGrid>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">About Part Types</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>- Part types are used to categorize spare parts for easy filtering and reporting.</li>
            <li>- The <strong>Code</strong> is auto-generated from the label (uppercase, underscores).</li>
            <li>- <strong>Sort Order</strong> determines the order in dropdown menus.</li>
            <li>- Deactivating a part type hides it from new entries but preserves existing records.</li>
            <li>- Part types with existing spare parts will be deactivated instead of deleted.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
