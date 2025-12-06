"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, Pencil, RefreshCw, MapPin, Users, Bus } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface Route {
  id: string
  name: string
  description: string | null
  operatorSharePercent: number | string
  driverSharePercent: number | string
  isActive: boolean
  _count?: { operators: number; drivers: number }
}

export default function RoutesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  // Only SUPER_ADMIN can access this page
  useEffect(() => {
    if (session && session.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    }
  }, [session, router])

  const fetchRoutes = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/routes?activeOnly=false&includeCount=true")
      const data = await res.json()
      if (data.success) setRoutes(data.data)
    } catch {
      toast.error("Failed to load routes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutes()
  }, [])

  if (session?.user?.role !== "SUPER_ADMIN") {
    return null
  }

  return (
    <div className="flex flex-col">
      <Header title="Route Management" />
      <div className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Routes</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchRoutes} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Link href="/dashboard/routes/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Route
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isMobile ? (
              // Mobile Card View
              <div className="space-y-3">
                {routes.map((route) => (
                  <div key={route.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                          <MapPin className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-semibold">{route.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {route.description || "No description"}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${route.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {route.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {route._count?.operators || 0} Operators
                      </span>
                      <span className="flex items-center gap-1">
                        <Bus className="h-4 w-4" />
                        {route._count?.drivers || 0} Drivers
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Share: </span>
                      <span className="font-medium">Operator {route.operatorSharePercent}%</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="font-medium">Driver {route.driverSharePercent}%</span>
                    </div>
                    <div className="flex justify-end">
                      <Link href={`/dashboard/routes/${route.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {routes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No routes found. Create your first route to get started.
                  </div>
                )}
              </div>
            ) : (
              // Desktop Table View
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Route Name</th>
                      <th className="text-left py-3 px-4 font-medium">Description</th>
                      <th className="text-center py-3 px-4 font-medium">Share %</th>
                      <th className="text-center py-3 px-4 font-medium">Operators</th>
                      <th className="text-center py-3 px-4 font-medium">Drivers</th>
                      <th className="text-center py-3 px-4 font-medium">Status</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route) => (
                      <tr key={route.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">{route.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {route.description || "-"}
                        </td>
                        <td className="py-3 px-4 text-center text-sm">
                          <span className="text-blue-600">Op: {route.operatorSharePercent}%</span>
                          <span className="text-muted-foreground"> / </span>
                          <span className="text-green-600">Dr: {route.driverSharePercent}%</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {route._count?.operators || 0}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {route._count?.drivers || 0}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${route.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {route.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/dashboard/routes/${route.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {routes.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          No routes found. Create your first route to get started.
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
