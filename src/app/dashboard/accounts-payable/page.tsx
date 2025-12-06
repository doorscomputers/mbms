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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, RefreshCw, AlertTriangle, CheckCircle, Clock, CreditCard, Bus as BusIcon, Calendar } from "lucide-react"
import { formatCurrency, formatDate, EXPENSE_CATEGORY_LABELS } from "@/lib/types"
import { useIsMobile } from "@/hooks/use-mobile"
import "devextreme/dist/css/dx.light.css"

interface Bus {
  id: string
  busNumber: string
  operator?: { name: string }
}

interface AccountsPayable {
  id: string
  busId: string
  category: string
  description: string
  amount: number
  dueDate: string | null
  paidAmount: number
  isPaid: boolean
  paidDate: string | null
  supplier: string | null
  invoiceNumber: string | null
  notes: string | null
  bus: Bus
}

interface APSummary {
  totalUnpaid: number
  unpaidCount: number
  totalPaid: number
  paidCount: number
  overdueAmount: number
  overdueCount: number
  byCategory: { category: string; amount: number; count: number }[]
}

const categories = Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, text]) => ({
  value,
  text,
}))

export default function AccountsPayablePage() {
  const [records, setRecords] = useState<AccountsPayable[]>([])
  const [buses, setBuses] = useState<Bus[]>([])
  const [summary, setSummary] = useState<APSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataGridRef = useRef<any>(null)

  const handleAddClick = () => {
    dataGridRef.current?.instance?.addRow()
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recordsRes, busesRes, summaryRes] = await Promise.all([
        fetch("/api/accounts-payable?limit=200"),
        fetch("/api/buses?includeOperator=true"),
        fetch("/api/accounts-payable/summary"),
      ])

      const recordsData = await recordsRes.json()
      const busesData = await busesRes.json()
      const summaryData = await summaryRes.json()

      if (recordsData.success) setRecords(recordsData.data)
      if (busesData.success) setBuses(busesData.data)
      if (summaryData.success) setSummary(summaryData.data)
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

  const onRowInserted = async (e: { data: Partial<AccountsPayable> }) => {
    try {
      const res = await fetch("/api/accounts-payable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e.data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Record added")
        fetchData()
      } else {
        toast.error(result.error || "Failed to add record")
      }
    } catch {
      toast.error("Failed to add record")
    }
  }

  const onRowUpdated = async (e: { key: string; data: Partial<AccountsPayable> }) => {
    try {
      const existingRecord = records.find((r) => r.id === e.key)
      const mergedData = { ...existingRecord, ...e.data }

      const res = await fetch(`/api/accounts-payable/${e.key}`, {
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
      const res = await fetch(`/api/accounts-payable/${e.key}`, {
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
      <Header title="Accounts Payable" />
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Unpaid
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(summary.totalUnpaid)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.unpaidCount} pending records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Overdue
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.overdueAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.overdueCount} overdue records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Paid
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalPaid)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.paidCount} paid records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  By Category (Unpaid)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {summary.byCategory.map((cat) => (
                  <div key={cat.category} className="flex justify-between text-sm">
                    <span>{EXPENSE_CATEGORY_LABELS[cat.category] || cat.category}</span>
                    <span className="font-medium">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Grid or Mobile Cards */}
        {isMobile ? (
          // Mobile Card View
          <div className="space-y-4">
            {/* Mobile Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Payables List</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Mobile Record Cards */}
            <div className="space-y-3">
              {records.map((record) => {
                const isOverdue = record.dueDate && new Date(record.dueDate) < new Date() && !record.isPaid
                return (
                  <div key={record.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className={`h-4 w-4 ${record.isPaid ? "text-green-500" : isOverdue ? "text-red-500" : "text-yellow-500"}`} />
                        <span className="font-medium">{record.description}</span>
                      </div>
                      <span className={`text-lg font-bold ${record.isPaid ? "text-green-600" : isOverdue ? "text-red-600" : "text-yellow-600"}`}>
                        {formatCurrency(record.amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      <div className="flex items-center gap-1">
                        <BusIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{record.bus?.busNumber}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                        {EXPENSE_CATEGORY_LABELS[record.category] || record.category}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        record.isPaid
                          ? "bg-green-100 text-green-700"
                          : isOverdue
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {record.isPaid ? "Paid" : isOverdue ? "Overdue" : "Unpaid"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                      {record.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className={isOverdue ? "text-red-600" : ""}>{formatDate(record.dueDate)}</span>
                        </div>
                      )}
                      {record.supplier && (
                        <div>
                          <span className="text-muted-foreground">Supplier:</span>
                          <span className="ml-1">{record.supplier}</span>
                        </div>
                      )}
                    </div>

                    {record.isPaid && record.paidDate && (
                      <div className="text-sm text-green-600">
                        <span>Paid {formatCurrency(record.paidAmount)} on {formatDate(record.paidDate)}</span>
                      </div>
                    )}

                    {record.invoiceNumber && (
                      <div className="text-sm text-muted-foreground">
                        Invoice: {record.invoiceNumber}
                      </div>
                    )}
                  </div>
                )
              })}
              {records.length === 0 && !loading && (
                <div className="p-8 text-center text-muted-foreground">
                  No payables found
                </div>
              )}
            </div>
          </div>
        ) : (
          // Desktop DataGrid View
          <DataGrid
          ref={dataGridRef}
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
              title: "Accounts Payable Record",
              showTitle: true,
              width: 600,
              height: 500,
            }}
          />

          <Toolbar>
            <Item location="before">
              <div className="text-lg font-semibold">Payables List</div>
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
                Add Payable
              </Button>
            </Item>
            <Item name="groupPanel" />
            <Item name="searchPanel" />
            <Item name="exportButton" />
          </Toolbar>

          <Column dataField="busId" caption="Bus" width={100} groupIndex={0}>
            <Lookup dataSource={buses} valueExpr="id" displayExpr="busNumber" />
          </Column>
          <Column dataField="category" caption="Category" width={130}>
            <Lookup dataSource={categories} valueExpr="value" displayExpr="text" />
          </Column>
          <Column dataField="description" caption="Description" />
          <Column
            dataField="amount"
            caption="Amount"
            dataType="number"
            width={120}
            cellRender={(data) => formatCurrency(data.value || 0)}
          />
          <Column
            dataField="dueDate"
            caption="Due Date"
            dataType="date"
            width={110}
            cellRender={(data) => {
              if (!data.value) return "-"
              const date = new Date(data.value)
              const isOverdue = date < new Date() && !data.data.isPaid
              return (
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                  {formatDate(data.value)}
                </span>
              )
            }}
          />
          <Column dataField="supplier" caption="Supplier" width={120} />
          <Column dataField="invoiceNumber" caption="Invoice #" width={100} />
          <Column
            dataField="isPaid"
            caption="Status"
            dataType="boolean"
            width={100}
            cellRender={(data) => (
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  data.value
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {data.value ? "Paid" : "Unpaid"}
              </span>
            )}
          />
          <Column
            dataField="paidAmount"
            caption="Paid Amt"
            dataType="number"
            width={100}
            cellRender={(data) => formatCurrency(data.value || 0)}
          />
          <Column
            dataField="paidDate"
            caption="Paid Date"
            dataType="date"
            width={100}
            cellRender={(data) => (data.value ? formatDate(data.value) : "-")}
          />
          <Column dataField="notes" caption="Notes" visible={false} />

          <Summary>
            <TotalItem
              column="amount"
              summaryType="sum"
              customizeText={(data) => {
                const value = typeof data.value === 'number' ? data.value : 0
                return `Total: ${formatCurrency(value)}`
              }}
            />
            <TotalItem
              column="paidAmount"
              summaryType="sum"
              customizeText={(data) => {
                const value = typeof data.value === 'number' ? data.value : 0
                return `Paid: ${formatCurrency(value)}`
              }}
            />
          </Summary>
        </DataGrid>
        )}
      </div>
    </div>
  )
}
