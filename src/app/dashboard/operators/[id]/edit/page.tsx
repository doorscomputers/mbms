"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { ArrowLeft, Save, Trash2 } from "lucide-react"

export default function EditOperatorPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    contactNumber: "",
    address: "",
    sharePercent: "60",
    isActive: true,
  })

  useEffect(() => {
    fetch(`/api/operators/${id}`)
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
      const res = await fetch(`/api/operators/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactNumber: form.contactNumber || null,
          address: form.address || null,
          sharePercent: parseFloat(form.sharePercent) || 60,
          isActive: form.isActive,
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
      </div>
    </div>
  )
}
