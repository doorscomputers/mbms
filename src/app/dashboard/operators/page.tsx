"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, Pencil, RefreshCw } from "lucide-react"

interface Operator {
  id: string
  name: string
  contactNumber: string | null
  address: string | null
  sharePercent: number
  isActive: boolean
}

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOperators = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/operators?activeOnly=false")
      const data = await res.json()
      if (data.success) setOperators(data.data)
    } catch {
      toast.error("Failed to load operators")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOperators()
  }, [])

  return (
    <div className="flex flex-col">
      <Header title="Operator Management" />
      <div className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Operators</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchOperators} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Link href="/dashboard/operators/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Operator
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Contact</th>
                    <th className="text-left p-2">Address</th>
                    <th className="text-left p-2">Share %</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((operator) => (
                    <tr key={operator.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{operator.name}</td>
                      <td className="p-2">{operator.contactNumber || "-"}</td>
                      <td className="p-2">{operator.address || "-"}</td>
                      <td className="p-2">{operator.sharePercent}%</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${operator.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {operator.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-2">
                        <Link href={`/dashboard/operators/${operator.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {operators.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        No operators found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
