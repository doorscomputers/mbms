"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import Link from "next/link"

interface Operator {
  id: string
  name: string
}

export default function EditBusPage() {
  const router = useRouter()
  const params = useParams()
  const busId = params.id as string

  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState({
    busNumber: "",
    plateNumber: "",
    model: "",
    capacity: "",
    operatorId: "",
    isActive: true,
  })

  useEffect(() => {
    Promise.all([
      fetch("/api/operators").then(res => res.json()),
      fetch(`/api/buses/${busId}`).then(res => res.json()),
    ]).then(([operatorsData, busData]) => {
      if (operatorsData.success) setOperators(operatorsData.data)
      if (busData.success) {
        const bus = busData.data
        setFormData({
          busNumber: bus.busNumber || "",
          plateNumber: bus.plateNumber || "",
          model: bus.model || "",
          capacity: bus.capacity?.toString() || "",
          operatorId: bus.operatorId || "",
          isActive: bus.isActive,
        })
      }
      setFetching(false)
    })
  }, [busId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.busNumber.trim()) {
      toast.error("Bus number is required")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/buses/${busId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busNumber: formData.busNumber,
          plateNumber: formData.plateNumber || null,
          model: formData.model || null,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          operatorId: formData.operatorId || null,
          isActive: formData.isActive,
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Bus updated successfully")
        router.push("/dashboard/buses")
      } else {
        toast.error(result.error || "Failed to update bus")
      }
    } catch {
      toast.error("Failed to update bus")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to deactivate this bus?")) return

    setLoading(true)
    try {
      const res = await fetch(`/api/buses/${busId}`, { method: "DELETE" })
      const result = await res.json()
      if (result.success) {
        toast.success("Bus deactivated successfully")
        router.push("/dashboard/buses")
      } else {
        toast.error(result.error || "Failed to delete bus")
      }
    } catch {
      toast.error("Failed to delete bus")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex flex-col">
        <Header title="Edit Bus" />
        <div className="flex-1 p-4 md:p-6">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Edit Bus" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-4">
          <Link href="/dashboard/buses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Buses
            </Button>
          </Link>
        </div>

        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Bus Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="busNumber">Bus Number *</Label>
                <Input
                  id="busNumber"
                  value={formData.busNumber}
                  onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                  placeholder="Enter bus number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plateNumber">Plate Number</Label>
                <Input
                  id="plateNumber"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                  placeholder="Enter plate number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Enter model"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="Enter capacity"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operator">Operator</Label>
                <Select
                  value={formData.operatorId}
                  onValueChange={(value) => setFormData({ ...formData, operatorId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Link href="/dashboard/buses">
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
