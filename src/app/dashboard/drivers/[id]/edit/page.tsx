"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import Link from "next/link"

export default function EditDriverPage() {
  const router = useRouter()
  const params = useParams()
  const driverId = params.id as string

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    licenseNumber: "",
    contactNumber: "",
    address: "",
    sharePercent: "40",
    isActive: true,
  })

  useEffect(() => {
    fetch(`/api/drivers/${driverId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const driver = data.data
          setFormData({
            name: driver.name || "",
            licenseNumber: driver.licenseNumber || "",
            contactNumber: driver.contactNumber || "",
            address: driver.address || "",
            sharePercent: driver.sharePercent?.toString() || "40",
            isActive: driver.isActive,
          })
        }
        setFetching(false)
      })
  }, [driverId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("Driver name is required")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/drivers/${driverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          licenseNumber: formData.licenseNumber || null,
          contactNumber: formData.contactNumber || null,
          address: formData.address || null,
          sharePercent: parseFloat(formData.sharePercent) || 40,
          isActive: formData.isActive,
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Driver updated successfully")
        router.push("/dashboard/drivers")
      } else {
        toast.error(result.error || "Failed to update driver")
      }
    } catch {
      toast.error("Failed to update driver")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to deactivate this driver?")) return

    setLoading(true)
    try {
      const res = await fetch(`/api/drivers/${driverId}`, { method: "DELETE" })
      const result = await res.json()
      if (result.success) {
        toast.success("Driver deactivated successfully")
        router.push("/dashboard/drivers")
      } else {
        toast.error(result.error || "Failed to delete driver")
      }
    } catch {
      toast.error("Failed to delete driver")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex flex-col">
        <Header title="Edit Driver" />
        <div className="flex-1 p-4 md:p-6">
          <p>Loading...</p>
        </div>
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  placeholder="Enter license number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  placeholder="Enter contact number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sharePercent">Share Percent (%)</Label>
                <Input
                  id="sharePercent"
                  type="number"
                  step="0.01"
                  value={formData.sharePercent}
                  onChange={(e) => setFormData({ ...formData, sharePercent: e.target.value })}
                  placeholder="Enter share percent"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Link href="/dashboard/drivers">
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
  )
}
