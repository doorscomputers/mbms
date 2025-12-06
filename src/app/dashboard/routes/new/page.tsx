"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { ArrowLeft, MapPin, Save } from "lucide-react"
import Link from "next/link"

export default function NewRoutePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    description: "",
    operatorSharePercent: "60",
    driverSharePercent: "40",
  })

  // Only SUPER_ADMIN can access this page
  if (session?.user?.role !== "SUPER_ADMIN") {
    router.push("/dashboard")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast.error("Route name is required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          operatorSharePercent: parseFloat(form.operatorSharePercent) || 60,
          driverSharePercent: parseFloat(form.driverSharePercent) || 40,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast.success("Route created successfully")
        router.push("/dashboard/routes")
      } else {
        toast.error(data.error || "Failed to create route")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Add New Route" />
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
                New Route
              </CardTitle>
              <CardDescription>
                Create a new route to group operators and drivers
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

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Creating..." : "Create Route"}
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
