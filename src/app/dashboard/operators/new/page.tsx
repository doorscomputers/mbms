"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { ArrowLeft, Save } from "lucide-react"

interface Route {
  id: string
  name: string
}

export default function NewOperatorPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [saving, setSaving] = useState(false)
  const [routes, setRoutes] = useState<Route[]>([])
  const [form, setForm] = useState({
    name: "",
    contactNumber: "",
    address: "",
    sharePercent: "60",
    routeId: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactNumber: form.contactNumber || null,
          address: form.address || null,
          sharePercent: parseFloat(form.sharePercent) || 60,
          routeId: isSuperAdmin ? (form.routeId || null) : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Operator created successfully")
        router.push("/dashboard/operators")
      } else {
        toast.error(data.error || "Failed to create operator")
      }
    } catch {
      toast.error("Failed to create operator")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Add New Operator" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-4">
          <Link href="/dashboard/operators">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Operators
            </Button>
          </Link>
        </div>

        <Card className="max-w-lg">
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
                  placeholder="e.g., Juan Dela Cruz"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                  placeholder="e.g., 09171234567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g., 123 Main St, City"
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

              {isRouteAdmin && session?.user?.routeName && (
                <div className="space-y-2">
                  <Label>Route</Label>
                  <div className="p-2 bg-muted rounded-md text-sm">
                    {session.user.routeName}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This operator will be assigned to your route automatically.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Link href="/dashboard/operators">
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
