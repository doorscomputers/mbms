"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { Plus, Pencil, RefreshCw } from "lucide-react"

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

  const fetchDrivers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/drivers?activeOnly=false")
      const data = await res.json()
      if (data.success) setDrivers(data.data)
    } catch {
      toast.error("Failed to load drivers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDrivers()
  }, [])

  return (
    <div className="flex flex-col">
      <Header title="Driver Management" />
      <div className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Drivers</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchDrivers} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Link href="/dashboard/drivers/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Driver
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
                    <th className="text-left p-2">License No.</th>
                    <th className="text-left p-2">Contact</th>
                    <th className="text-left p-2">Address</th>
                    <th className="text-left p-2">Share %</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver) => (
                    <tr key={driver.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{driver.name}</td>
                      <td className="p-2">{driver.licenseNumber || "-"}</td>
                      <td className="p-2">{driver.contactNumber || "-"}</td>
                      <td className="p-2">{driver.address || "-"}</td>
                      <td className="p-2">{driver.sharePercent}%</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${driver.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {driver.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-2">
                        <Link href={`/dashboard/drivers/${driver.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {drivers.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-muted-foreground">
                        No drivers found
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
