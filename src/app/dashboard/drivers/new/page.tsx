"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { ArrowLeft, Save } from "lucide-react"

export default function NewDriverPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    licenseNumber: "",
    contactNumber: "",
    address: "",
    sharePercent: "40",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          licenseNumber: form.licenseNumber || null,
          contactNumber: form.contactNumber || null,
          address: form.address || null,
          sharePercent: parseFloat(form.sharePercent) || 40,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Driver created successfully")
        router.push("/dashboard/drivers")
      } else {
        toast.error(data.error || "Failed to create driver")
      }
    } catch {
      toast.error("Failed to create driver")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Add New Driver" />
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
                  placeholder="e.g., Juan Dela Cruz"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                  placeholder="e.g., N01-12-345678"
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

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
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
