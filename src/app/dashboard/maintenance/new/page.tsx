"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { MAINTENANCE_TYPE_LABELS, formatCurrency } from "@/lib/types"
import { ArrowLeft, Calculator } from "lucide-react"
import Link from "next/link"

const formSchema = z.object({
  busId: z.string().min(1, "Bus is required"),
  date: z.string().min(1, "Date is required"),
  maintenanceType: z.string().min(1, "Maintenance type is required"),
  description: z.string().optional(),
  sparePartsCost: z.string().optional(),
  laborCost: z.string().optional(),
  miscellaneousCost: z.string().optional(),
  odometerReading: z.string().optional(),
  serviceProvider: z.string().optional(),
  mechanicName: z.string().optional(),
  remarks: z.string().optional(),
  nextServiceDate: z.string().optional(),
  nextServiceOdometer: z.string().optional(),
  notes: z.string().optional(),
  createPayable: z.boolean().default(false),
})

type FormData = z.infer<typeof formSchema>

interface Bus {
  id: string
  busNumber: string
  operator?: { name: string }
}

export default function NewMaintenancePage() {
  const router = useRouter()
  const [buses, setBuses] = useState<Bus[]>([])
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      busId: "",
      date: new Date().toISOString().split("T")[0],
      maintenanceType: "",
      description: "",
      sparePartsCost: "0",
      laborCost: "0",
      miscellaneousCost: "0",
      odometerReading: "",
      serviceProvider: "",
      mechanicName: "",
      remarks: "",
      nextServiceDate: "",
      nextServiceOdometer: "",
      notes: "",
      createPayable: false,
    },
  })

  const watchedValues = form.watch()
  const totalCost =
    parseFloat(watchedValues.sparePartsCost || "0") +
    parseFloat(watchedValues.laborCost || "0") +
    parseFloat(watchedValues.miscellaneousCost || "0")

  useEffect(() => {
    async function fetchBuses() {
      try {
        const res = await fetch("/api/buses?includeOperator=true")
        const data = await res.json()
        if (data.success) setBuses(data.data)
      } catch (error) {
        console.error("Error fetching buses:", error)
        toast.error("Failed to load buses")
      }
    }
    fetchBuses()
  }, [])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      // Calculate total cost
      const totalCost =
        parseFloat(data.sparePartsCost || "0") +
        parseFloat(data.laborCost || "0") +
        parseFloat(data.miscellaneousCost || "0")

      const maintenanceData = {
        ...data,
        totalCost: totalCost.toString(),
      }

      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maintenanceData),
      })

      const result = await res.json()
      if (result.success) {
        // If createPayable is checked, create accounts payable records
        if (data.createPayable && totalCost > 0) {
          const payablePromises = []

          if (parseFloat(data.sparePartsCost || "0") > 0) {
            payablePromises.push(
              fetch("/api/accounts-payable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  busId: data.busId,
                  category: "SPARE_PARTS",
                  description: `${MAINTENANCE_TYPE_LABELS[data.maintenanceType]} - Spare Parts`,
                  amount: data.sparePartsCost,
                  maintenanceId: result.data.id,
                }),
              })
            )
          }

          if (parseFloat(data.laborCost || "0") > 0) {
            payablePromises.push(
              fetch("/api/accounts-payable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  busId: data.busId,
                  category: "LABOR",
                  description: `${MAINTENANCE_TYPE_LABELS[data.maintenanceType]} - Labor`,
                  amount: data.laborCost,
                  maintenanceId: result.data.id,
                }),
              })
            )
          }

          if (parseFloat(data.miscellaneousCost || "0") > 0) {
            payablePromises.push(
              fetch("/api/accounts-payable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  busId: data.busId,
                  category: "MISCELLANEOUS",
                  description: `${MAINTENANCE_TYPE_LABELS[data.maintenanceType]} - Misc`,
                  amount: data.miscellaneousCost,
                  maintenanceId: result.data.id,
                }),
              })
            )
          }

          await Promise.all(payablePromises)
        }

        toast.success("Maintenance record created")
        router.push("/dashboard/maintenance")
      } else {
        toast.error(result.error || "Failed to create record")
      }
    } catch {
      toast.error("Failed to create record")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="New Maintenance Record" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-6">
          <Link href="/dashboard/maintenance">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Maintenance
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Maintenance Details</CardTitle>
                    <CardDescription>Record a maintenance service or repair</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="busId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bus</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select bus" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {buses.map((bus) => (
                                <SelectItem key={bus.id} value={bus.id}>
                                  Bus #{bus.busNumber}
                                  {bus.operator && ` - ${bus.operator.name}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maintenanceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maintenance Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="odometerReading"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Odometer Reading</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="serviceProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Provider / Shop</FormLabel>
                          <FormControl>
                            <Input placeholder="Shop name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mechanicName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mechanic Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Mechanic who did the job" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="sm:col-span-2">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe the work done..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mechanic Remarks</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Job remarks from mechanic..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cost Breakdown</CardTitle>
                    <CardDescription>
                      Separate costs by category (Spare Parts, Labor, Miscellaneous)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="sparePartsCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Spare Parts Cost</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="laborCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Labor Cost</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="miscellaneousCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Miscellaneous</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="sm:col-span-3">
                      <FormField
                        control={form.control}
                        name="createPayable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Create Accounts Payable</FormLabel>
                              <FormDescription>
                                Automatically create payable records for tracking unpaid maintenance costs
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Next Service Reminder</CardTitle>
                    <CardDescription>Schedule the next service (optional)</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="nextServiceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Next Service Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nextServiceOdometer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Next Service Odometer</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="sm:col-span-2">
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Any additional notes..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Record"}
                  </Button>
                  <Link href="/dashboard/maintenance">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </div>

          {/* Cost Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Cost Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spare Parts</span>
                  <span>{formatCurrency(parseFloat(watchedValues.sparePartsCost || "0"))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Labor</span>
                  <span>{formatCurrency(parseFloat(watchedValues.laborCost || "0"))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Miscellaneous</span>
                  <span>{formatCurrency(parseFloat(watchedValues.miscellaneousCost || "0"))}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Total Cost</span>
                  <span className="text-lg text-primary">{formatCurrency(totalCost)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
