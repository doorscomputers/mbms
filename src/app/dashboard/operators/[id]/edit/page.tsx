"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { ArrowLeft, Save, Trash2, Bus, Plus, Pencil, Loader2 } from "lucide-react"

interface Route {
  id: string
  name: string
}

interface BusInfo {
  id: string
  busNumber: string
  plateNumber: string | null
  model: string | null
  defaultDriver?: { id: string; name: string } | null
  isActive: boolean
}

export default function EditOperatorPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [routes, setRoutes] = useState<Route[]>([])
  const [buses, setBuses] = useState<BusInfo[]>([])
  const [unassignedBuses, setUnassignedBuses] = useState<BusInfo[]>([])
  const [selectedBusId, setSelectedBusId] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [form, setForm] = useState({
    name: "",
    contactNumber: "",
    address: "",
    sharePercent: "60",
    isActive: true,
    routeId: "",
    routeName: "",
  })

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"
  const isRouteAdmin = session?.user?.role === "ROUTE_ADMIN"

  useEffect(() => {
    // Only SUPER_ADMIN needs to fetch routes
    if (isSuperAdmin) {
      fetch("/api/routes")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setRoutes(data.data)
        })
    }
  }, [isSuperAdmin])

  const fetchUnassignedBuses = async () => {
    try {
      const res = await fetch("/api/buses?activeOnly=true")
      const data = await res.json()
      if (data.success) {
        // Filter buses where operatorId is null
        const unassigned = data.data.filter((bus: { operatorId: string | null }) => !bus.operatorId)
        setUnassignedBuses(unassigned)
      }
    } catch (err) {
      console.error("Failed to fetch unassigned buses:", err)
    }
  }

  useEffect(() => {
    // Fetch operator info
    fetch(`/api/operators/${id}?includeBuses=true`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const op = data.data
          setForm({
            name: op.name || "",
            contactNumber: op.contactNumber || "",
            address: op.address || "",
            sharePercent: op.sharePercent?.toString() || "60",
            isActive: op.isActive,
            routeId: op.routeId || "",
            routeName: op.route?.name || "",
          })
          // Set buses if included
          if (op.buses) {
            setBuses(op.buses)
          }
        }
        setLoading(false)
      })

    // Fetch unassigned buses for assignment dropdown
    fetchUnassignedBuses()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/operators/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactNumber: form.contactNumber || null,
          address: form.address || null,
          sharePercent: parseFloat(form.sharePercent) || 60,
          isActive: form.isActive,
          routeId: isSuperAdmin ? (form.routeId || null) : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Operator updated successfully")
        router.push("/dashboard/operators")
      } else {
        toast.error(data.error || "Failed to update operator")
      }
    } catch {
      toast.error("Failed to update operator")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this operator?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/operators/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success("Operator deleted")
        router.push("/dashboard/operators")
      } else {
        toast.error(data.error || "Failed to delete")
      }
    } catch {
      toast.error("Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  const handleAssignBus = async () => {
    if (!selectedBusId) {
      toast.error("Please select a bus to assign")
      return
    }
    setAssigning(true)
    try {
      const res = await fetch(`/api/buses/${selectedBusId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorId: id }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Bus assigned successfully")
        // Add the bus to the assigned list
        const assignedBus = unassignedBuses.find((b) => b.id === selectedBusId)
        if (assignedBus) {
          setBuses((prev) => [...prev, assignedBus])
        }
        // Remove from unassigned list
        setUnassignedBuses((prev) => prev.filter((b) => b.id !== selectedBusId))
        setSelectedBusId("")
      } else {
        toast.error(data.error || "Failed to assign bus")
      }
    } catch {
      toast.error("Failed to assign bus")
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Edit Operator" />
        <div className="flex-1 p-4 md:p-6">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Edit Operator" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-4">
          <Link href="/dashboard/operators">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Operators
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Operator Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sharePercent">Share Percent (%)</Label>
                <Input
                  id="sharePercent"
                  type="number"
                  step="0.01"
                  value={form.sharePercent}
                  onChange={(e) => setForm({ ...form, sharePercent: e.target.value })}
                />
              </div>

              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="routeId">Route</Label>
                  <Select
                    value={form.routeId}
                    onValueChange={(value) => setForm({ ...form, routeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a route (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isRouteAdmin && form.routeName && (
                <div className="space-y-2">
                  <Label>Route</Label>
                  <div className="p-2 bg-muted rounded-md text-sm">
                    {form.routeName}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Link href="/dashboard/operators">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Assigned Buses Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  Assigned Buses
                </CardTitle>
                <CardDescription>
                  Buses owned by this operator
                </CardDescription>
              </div>
              <Link href={`/dashboard/buses/new?operatorId=${id}`}>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Bus
                </Button>
              </Link>
            </div>

            {/* Assign existing bus dropdown */}
            {unassignedBuses.length > 0 && (
              <div className="flex gap-2 mt-4">
                <Select value={selectedBusId} onValueChange={setSelectedBusId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select an unassigned bus..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedBuses.map((bus) => (
                      <SelectItem key={bus.id} value={bus.id}>
                        {bus.busNumber} {bus.plateNumber ? `(${bus.plateNumber})` : ""} {bus.model ? `- ${bus.model}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignBus}
                  disabled={!selectedBusId || assigning}
                  size="default"
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Assign"
                  )}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {buses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No buses assigned to this operator</p>
                <p className="text-sm mt-1">Click &quot;Add Bus&quot; to assign one</p>
              </div>
            ) : (
              <div className="space-y-3">
                {buses.map((bus) => (
                  <div
                    key={bus.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Bus className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">{bus.busNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {bus.plateNumber || "No plate"} {bus.model ? `• ${bus.model}` : ""}
                        </div>
                        {bus.defaultDriver && (
                          <div className="text-xs text-muted-foreground">
                            Driver: {bus.defaultDriver.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          bus.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {bus.isActive ? "Active" : "Inactive"}
                      </span>
                      <Link href={`/dashboard/buses/${bus.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
