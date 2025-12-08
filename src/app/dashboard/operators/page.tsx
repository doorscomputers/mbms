"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, Pencil, RefreshCw, UserCog, MapPin, Loader2 } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface Operator {
  id: string
  name: string
  contactNumber: string | null
  address: string | null
  sharePercent: number
  isActive: boolean
  route?: { id: string; name: string } | null
}

export default function OperatorsPage() {
  const { data: session } = useSession()
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

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
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading operators...</p>
                </div>
              </div>
            ) : isMobile ? (
              // Mobile Card View
              <div className="space-y-3">
                {operators.map((operator) => (
                  <div key={operator.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                          <UserCog className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{operator.name}</div>
                          <div className="text-sm text-muted-foreground">{operator.contactNumber || "No contact"}</div>
                          {isSuperAdmin && operator.route && (
                            <div className="flex items-center gap-1 text-xs text-purple-600">
                              <MapPin className="h-3 w-3" />
                              {operator.route.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${operator.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {operator.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Share:</span>
                        <span className="ml-1 font-medium text-blue-600">{operator.sharePercent}%</span>
                      </div>
                      {operator.address && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Address:</span>
                          <span className="ml-1 font-medium">{operator.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t">
                      <Link href={`/dashboard/operators/${operator.id}/edit`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Operator
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {operators.length === 0 && !loading && (
                  <div className="p-4 text-center text-muted-foreground">
                    No operators found
                  </div>
                )}
              </div>
            ) : (
              // Desktop Table View
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      {isSuperAdmin && <th className="text-left p-2">Route</th>}
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
                        {isSuperAdmin && (
                          <td className="p-2">
                            {operator.route ? (
                              <span className="inline-flex items-center gap-1 text-purple-600">
                                <MapPin className="h-3 w-3" />
                                {operator.route.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        )}
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
                        <td colSpan={isSuperAdmin ? 7 : 6} className="p-4 text-center text-muted-foreground">
                          No operators found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
