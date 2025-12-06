"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { ArrowLeft, MapPin, Save, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function EditRoutePage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    description: "",
    operatorSharePercent: "60",
    driverSharePercent: "40",
    isActive: true,
  })

  // Only SUPER_ADMIN can access this page
  useEffect(() => {
    if (session && session.user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard")
    }
  }, [session, router])

  useEffect(() => {
    async function fetchRoute() {
      try {
        const res = await fetch(`/api/routes/${params.id}`)
        const data = await res.json()
        if (data.success) {
          setForm({
            name: data.data.name,
            description: data.data.description || "",
            operatorSharePercent: String(data.data.operatorSharePercent || 60),
            driverSharePercent: String(data.data.driverSharePercent || 40),
            isActive: data.data.isActive,
          })
        } else {
          toast.error("Route not found")
          router.push("/dashboard/routes")
        }
      } catch {
        toast.error("Failed to load route")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchRoute()
    }
  }, [params.id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast.error("Route name is required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/routes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          operatorSharePercent: parseFloat(form.operatorSharePercent) || 60,
          driverSharePercent: parseFloat(form.driverSharePercent) || 40,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success("Route updated successfully")
        router.push("/dashboard/routes")
      } else {
        toast.error(data.error || "Failed to update route")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  if (session?.user?.role !== "SUPER_ADMIN") {
    return null
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Edit Route" />
        <div className="flex-1 p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Edit Route" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <Link href="/dashboard/routes">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Routes
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Edit Route
              </CardTitle>
              <CardDescription>
                Update route details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Route Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Trancoville Route"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional description for this route"
                    rows={3}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3">Share Percentages</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set the default share percentages for operators and drivers on this route.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="operatorSharePercent">Operator Share %</Label>
                      <Input
                        id="operatorSharePercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.operatorSharePercent}
                        onChange={(e) => setForm({ ...form, operatorSharePercent: e.target.value })}
                        placeholder="60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driverSharePercent">Driver Share %</Label>
                      <Input
                        id="driverSharePercent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.driverSharePercent}
                        onChange={(e) => setForm({ ...form, driverSharePercent: e.target.value })}
                        placeholder="40"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Link href="/dashboard/routes">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
