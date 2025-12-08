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
  Summary,
  TotalItem,
  GroupPanel,
  Grouping,
} from "devextreme-react/data-grid"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/header"
import { QuickAddPartType } from "@/components/quick-add-part-type"
import { toast } from "sonner"
import { Plus, RefreshCw, Settings, Package, Calendar, Bus as BusIcon, Loader2 } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/types"
import Link from "next/link"
import { useIsMobile } from "@/hooks/use-mobile"
import "devextreme/dist/css/dx.light.css"

interface Bus {
  id: string
  busNumber: string
  operator?: { name: string }
}

interface PartType {
  id: string
  code: string
  label: string
  isActive: boolean
}

interface SparePart {
  id: string
  busId: string
  partName: string
  partType: string
  brand: string | null
  quantity: number
  unitCost: number
  totalCost: number
  purchaseDate: string
  installedDate: string | null
  supplier: string | null
  warrantyExpiry: string | null
  expectedLifeDays: number | null
  notes: string | null
  bus: Bus
}

export default function SparePartsPage() {
  const [parts, setParts] = useState<SparePart[]>([])
  const [buses, setBuses] = useState<Bus[]>([])
  const [partTypes, setPartTypes] = useState<{ value: string; text: string }[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataGridRef = useRef<any>(null)

  const handleAddClick = () => {
    dataGridRef.current?.instance?.addRow()
  }

  const fetchPartTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/part-types?seedIfEmpty=true")
      const data = await res.json()
      if (data.success) {
        const types = data.data.map((pt: PartType) => ({
          value: pt.code,
          text: pt.label,
        }))
        setPartTypes(types)
        return types
      }
    } catch (error) {
      console.error("Error fetching part types:", error)
    }
    return []
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [partsRes, busesRes] = await Promise.all([
        fetch("/api/spare-parts?limit=200"),
        fetch("/api/buses?includeOperator=true"),
      ])

      const partsData = await partsRes.json()
      const busesData = await busesRes.json()

      if (partsData.success) setParts(partsData.data)
      if (busesData.success) setBuses(busesData.data)
      await fetchPartTypes()
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [fetchPartTypes])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePartTypeAdded = async () => {
    // Refresh part types after adding - the grid will re-render with updated lookup
    await fetchPartTypes()
  }

  const onRowInserted = async (e: { data: Partial<SparePart> }) => {
    try {
      const res = await fetch("/api/spare-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Spare part added")
        fetchData()
      } else {
        toast.error(result.error || "Failed to add part")
      }
    } catch {
      toast.error("Failed to add part")
    }
  }

  const onRowUpdated = async (e: { key: string; data: Partial<SparePart> }) => {
    try {
      const existingPart = parts.find((p) => p.id === e.key)
      const mergedData = { ...existingPart, ...e.data }

      const res = await fetch(`/api/spare-parts/${e.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedData),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Part updated")
        fetchData()
      } else {
        toast.error(result.error || "Failed to update part")
      }
    } catch {
      toast.error("Failed to update part")
    }
  }

  const onRowRemoved = async (e: { key: string }) => {
    try {
      const res = await fetch(`/api/spare-parts/${e.key}`, {
        method: "DELETE",
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Part deleted")
        fetchData()
      } else {
        toast.error(result.error || "Failed to delete part")
      }
    } catch {
      toast.error("Failed to delete part")
    }
  }

  // Calculate days since installation for status display
  const getDaysInfo = (installedDate: string | null, expectedLifeDays: number | null) => {
    if (!installedDate) return { days: null, status: "unknown" }
    const installed = new Date(installedDate)
    const now = new Date()
    const daysSince = Math.floor((now.getTime() - installed.getTime()) / (1000 * 60 * 60 * 24))

    if (!expectedLifeDays) return { days: daysSince, status: "unknown" }

    const remaining = expectedLifeDays - daysSince
    if (remaining < 0) return { days: daysSince, status: "overdue", remaining }
    if (remaining < 30) return { days: daysSince, status: "warning", remaining }
    return { days: daysSince, status: "good", remaining }
  }

  // Calculate totals for mobile summary
  const totalCost = parts.reduce((acc, part) => acc + part.totalCost, 0)
  const totalParts = parts.reduce((acc, part) => acc + part.quantity, 0)

  // Get part type label from code
  const getPartTypeLabel = (code: string) => {
    const type = partTypes.find((t) => t.value === code)
    return type?.text || code
  }

  return (
    <div className="flex flex-col">
      <Header title="Spare Parts Tracking" />
      <div className="flex-1 p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading spare parts...</p>
            </div>
          </div>
        ) : isMobile ? (
          // Mobile Card View
          <div className="space-y-4">
            {/* Mobile Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Spare Parts</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Link href="/dashboard/settings/part-types">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Summary */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-xs text-purple-600">Total Cost</div>
                <div className="text-sm font-bold text-purple-700">{formatCurrency(totalCost)}</div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3">
                <div className="text-xs text-indigo-600">Total Parts</div>
                <div className="text-sm font-bold text-indigo-700">{totalParts}</div>
              </div>
            </div>

            {/* Mobile Record Cards */}
            <div className="space-y-3">
              {parts.map((part) => {
                const statusInfo = getDaysInfo(part.installedDate, part.expectedLifeDays)
                return (
                  <div key={part.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">{part.partName}</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">
                        {formatCurrency(part.totalCost)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      <div className="flex items-center gap-1">
                        <BusIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{part.bus?.busNumber}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                        {getPartTypeLabel(part.partType)}
                      </span>
                      {part.brand && (
                        <span className="text-muted-foreground">{part.brand}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(part.purchaseDate)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Qty:</span>
                        <span className="ml-1 font-medium">{part.quantity}</span>
                        <span className="text-muted-foreground ml-1">×</span>
                        <span className="ml-1">{formatCurrency(part.unitCost)}</span>
                      </div>
                    </div>

                    {part.installedDate && (
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-muted-foreground">Installed:</span>
                          <span className="ml-1">{formatDate(part.installedDate)}</span>
                        </div>
                        {statusInfo.status !== "unknown" && (
                          <span className={`font-medium ${
                            statusInfo.status === "overdue" ? "text-red-600" :
                            statusInfo.status === "warning" ? "text-yellow-600" : "text-green-600"
                          }`}>
                            {statusInfo.status === "overdue" ? `Overdue (${Math.abs(statusInfo.remaining!)}d)` :
                             statusInfo.status === "warning" ? `Due soon (${statusInfo.remaining}d)` :
                             `OK (${statusInfo.remaining}d left)`}
                          </span>
                        )}
                      </div>
                    )}

                    {part.supplier && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Supplier:</span>
                        <span className="ml-1">{part.supplier}</span>
                      </div>
                    )}
                  </div>
                )
              })}
              {parts.length === 0 && !loading && (
                <div className="p-8 text-center text-muted-foreground">
                  No spare parts found
                </div>
              )}
            </div>
          </div>
        ) : (
          // Desktop DataGrid View
          <DataGrid
          ref={dataGridRef}
          dataSource={parts}
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
              title: "Spare Part Record",
              showTitle: true,
              width: 700,
              height: 600,
            }}
          />

          <Toolbar>
            <Item location="before">
              <div className="text-lg font-semibold">Spare Parts Inventory</div>
            </Item>
            <Item location="after">
              <QuickAddPartType onPartTypeAdded={handlePartTypeAdded} />
            </Item>
            <Item location="after">
              <Link href="/dashboard/settings/part-types">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Types
                </Button>
              </Link>
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
                Add Part
              </Button>
            </Item>
            <Item name="groupPanel" />
            <Item name="searchPanel" />
            <Item name="exportButton" />
          </Toolbar>

          <Column dataField="busId" caption="Bus" width={100} groupIndex={0}>
            <Lookup dataSource={buses} valueExpr="id" displayExpr="busNumber" />
          </Column>
          <Column
            dataField="purchaseDate"
            caption="Purchase Date"
            dataType="date"
            width={110}
            sortOrder="desc"
            cellRender={(data) => formatDate(data.value)}
          />
          <Column dataField="partName" caption="Part Name" />
          <Column dataField="partType" caption="Type" width={140}>
            <Lookup dataSource={partTypes} valueExpr="value" displayExpr="text" />
          </Column>
          <Column dataField="brand" caption="Brand" width={100} />
          <Column dataField="quantity" caption="Qty" dataType="number" width={60} />
          <Column
            dataField="unitCost"
            caption="Unit Cost"
            dataType="number"
            width={100}
            cellRender={(data) => formatCurrency(data.value || 0)}
          />
          <Column
            dataField="totalCost"
            caption="Total Cost"
            dataType="number"
            width={110}
            cellRender={(data) => formatCurrency(data.value || 0)}
          />
          <Column dataField="supplier" caption="Supplier" width={120} />
          <Column
            dataField="installedDate"
            caption="Installed"
            dataType="date"
            width={100}
            cellRender={(data) => (data.value ? formatDate(data.value) : "-")}
          />
          <Column
            dataField="expectedLifeDays"
            caption="Expected Life"
            dataType="number"
            width={100}
            cellRender={(data) => (data.value ? `${data.value} days` : "-")}
          />
          <Column
            caption="Status"
            width={120}
            allowFiltering={false}
            allowSorting={false}
            cellRender={(data) => {
              const info = getDaysInfo(data.data.installedDate, data.data.expectedLifeDays)
              if (info.status === "unknown") {
                return <span className="text-gray-400">-</span>
              }
              if (info.status === "overdue") {
                return (
                  <span className="text-red-600 font-medium">
                    Overdue ({Math.abs(info.remaining!)}d)
                  </span>
                )
              }
              if (info.status === "warning") {
                return (
                  <span className="text-yellow-600 font-medium">
                    Due soon ({info.remaining}d)
                  </span>
                )
              }
              return (
                <span className="text-green-600">
                  OK ({info.remaining}d left)
                </span>
              )
            }}
          />
          <Column
            dataField="warrantyExpiry"
            caption="Warranty"
            dataType="date"
            width={100}
            cellRender={(data) => {
              if (!data.value) return "-"
              const date = new Date(data.value)
              const isExpired = date < new Date()
              return (
                <span className={isExpired ? "text-red-600" : "text-green-600"}>
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
              column="quantity"
              summaryType="sum"
              displayFormat="Total Parts: {0}"
            />
          </Summary>
        </DataGrid>
        )}
      </div>
    </div>
  )
}
