"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, Pencil, RefreshCw, Bus as BusIcon, Loader2 } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface Bus {
  id: string
  busNumber: string
  plateNumber: string | null
  model: string | null
  capacity: number | null
  operator?: { name: string } | null
  defaultDriver?: { name: string } | null
  isActive: boolean
}

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  const fetchBuses = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/buses?includeOperator=true&activeOnly=false")
      const data = await res.json()
      if (data.success) setBuses(data.data)
    } catch {
      toast.error("Failed to load buses")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBuses()
  }, [])

  return (
    <div className="flex flex-col">
      <Header title="Bus Management" />
      <div className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Buses</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchBuses} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Link href="/dashboard/buses/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bus
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading buses...</p>
                </div>
              </div>
            ) : isMobile ? (
              // Mobile Card View
              <div className="space-y-3">
                {buses.map((bus) => (
                  <div key={bus.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <BusIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">{bus.busNumber}</div>
                          <div className="text-sm text-muted-foreground">{bus.plateNumber || "No plate"}</div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${bus.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {bus.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Model:</span>
                        <span className="ml-1 font-medium">{bus.model || "-"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Capacity:</span>
                        <span className="ml-1 font-medium">{bus.capacity || "-"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Operator:</span>
                        <span className="ml-1 font-medium">{bus.operator?.name || "-"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Default Driver:</span>
                        <span className="ml-1 font-medium">{bus.defaultDriver?.name || "-"}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <Link href={`/dashboard/buses/${bus.id}/edit`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Bus
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {buses.length === 0 && !loading && (
                  <div className="p-4 text-center text-muted-foreground">
                    No buses found
                  </div>
                )}
              </div>
            ) : (
              // Desktop Table View
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Bus No.</th>
                      <th className="text-left p-2">Plate Number</th>
                      <th className="text-left p-2">Model</th>
                      <th className="text-left p-2">Capacity</th>
                      <th className="text-left p-2">Operator</th>
                      <th className="text-left p-2">Default Driver</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buses.map((bus) => (
                      <tr key={bus.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{bus.busNumber}</td>
                        <td className="p-2">{bus.plateNumber || "-"}</td>
                        <td className="p-2">{bus.model || "-"}</td>
                        <td className="p-2">{bus.capacity || "-"}</td>
                        <td className="p-2">{bus.operator?.name || "-"}</td>
                        <td className="p-2">{bus.defaultDriver?.name || "-"}</td>
                        <td className="p-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${bus.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {bus.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-2">
                          <Link href={`/dashboard/buses/${bus.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {buses.length === 0 && !loading && (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-muted-foreground">
                          No buses found
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
