"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/layout/header"
import { toast } from "sonner"
import { ArrowLeft, Save } from "lucide-react"

interface Operator {
  id: string
  name: string
}

interface Driver {
  id: string
  name: string
}

export default function NewBusPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedOperatorId = searchParams.get("operatorId") || ""

  const [operators, setOperators] = useState<Operator[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    busNumber: "",
    plateNumber: "",
    model: "",
    capacity: "",
    operatorId: preselectedOperatorId,
    defaultDriverId: "",
  })

  useEffect(() => {
    Promise.all([
      fetch("/api/operators").then((res) => res.json()),
      fetch("/api/drivers").then((res) => res.json()),
    ]).then(([opsData, driversData]) => {
      if (opsData.success) setOperators(opsData.data)
      if (driversData.success) setDrivers(driversData.data)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.busNumber.trim()) {
      toast.error("Bus number is required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/buses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busNumber: form.busNumber,
          plateNumber: form.plateNumber || null,
          model: form.model || null,
          capacity: form.capacity ? parseInt(form.capacity) : null,
          operatorId: form.operatorId || null,
          defaultDriverId: form.defaultDriverId || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Bus created successfully")
        router.push("/dashboard/buses")
      } else {
        toast.error(data.error || "Failed to create bus")
      }
    } catch {
      toast.error("Failed to create bus")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Add New Bus" />
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
                  value={form.busNumber}
                  onChange={(e) => setForm({ ...form, busNumber: e.target.value })}
                  placeholder="e.g., 001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plateNumber">Plate Number</Label>
                <Input
                  id="plateNumber"
                  value={form.plateNumber}
                  onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                  placeholder="e.g., ABC 1234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="e.g., Toyota Hiace"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="e.g., 18"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operatorId">Operator</Label>
                <Select value={form.operatorId} onValueChange={(v) => setForm({ ...form, operatorId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultDriverId">Default Driver</Label>
                <Select value={form.defaultDriverId} onValueChange={(v) => setForm({ ...form, defaultDriverId: v === "none" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select default driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No default driver</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Auto-fills driver when this bus is selected during collection entry
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Link href="/dashboard/buses">
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
