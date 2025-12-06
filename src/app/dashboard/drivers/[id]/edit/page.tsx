"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { ArrowLeft, Save, Trash2 } from "lucide-react"

interface Route {
  id: string
  name: string
}

export default function EditDriverPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [routes, setRoutes] = useState<Route[]>([])
  const [form, setForm] = useState({
    name: "",
    licenseNumber: "",
    contactNumber: "",
    address: "",
    sharePercent: "40",
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

  useEffect(() => {
    fetch(`/api/drivers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const d = data.data
          setForm({
            name: d.name || "",
            licenseNumber: d.licenseNumber || "",
            contactNumber: d.contactNumber || "",
            address: d.address || "",
            sharePercent: d.sharePercent?.toString() || "40",
            isActive: d.isActive,
            routeId: d.routeId || "",
            routeName: d.route?.name || "",
          })
        }
        setLoading(false)
      })
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/drivers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          licenseNumber: form.licenseNumber || null,
          contactNumber: form.contactNumber || null,
          address: form.address || null,
          sharePercent: parseFloat(form.sharePercent) || 40,
          isActive: form.isActive,
          routeId: isSuperAdmin ? (form.routeId || null) : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Driver updated successfully")
        router.push("/dashboard/drivers")
      } else {
        toast.error(data.error || "Failed to update driver")
      }
    } catch {
      toast.error("Failed to update driver")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this driver?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/drivers/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        toast.success("Driver deleted")
        router.push("/dashboard/drivers")
      } else {
        toast.error(data.error || "Failed to delete")
      }
    } catch {
      toast.error("Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Edit Driver" />
        <div className="flex-1 p-4 md:p-6">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Edit Driver" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-4">
          <Link href="/dashboard/drivers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Drivers
            </Button>
          </Link>
        </div>

        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Driver Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
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
                <Link href="/dashboard/drivers">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
