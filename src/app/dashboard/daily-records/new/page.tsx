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
import {
  Form,
  FormControl,
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
import { formatCurrency, calculateShares, SETTINGS_KEYS } from "@/lib/types"
import { ArrowLeft, Save, Calculator } from "lucide-react"
import Link from "next/link"

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  busId: z.string().min(1, "Bus is required"),
  driverId: z.string().min(1, "Driver is required"),
  totalCollection: z.string().min(1, "Gross Collection is required"),
  dieselCost: z.string().min(1, "Diesel Cost is required"),
  coopContribution: z.string().optional(),
  otherExpenses: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface Bus {
  id: string
  busNumber: string
  operator?: { id: string; name: string }
}

interface Driver {
  id: string
  name: string
}

interface Settings {
  weekdayMinimum: number
  sundayMinimum: number
  defaultCoop: number
  driverBasePay: number
}

export default function NewDailyRecordPage() {
  const router = useRouter()
  const [buses, setBuses] = useState<Bus[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    weekdayMinimum: 6000,
    sundayMinimum: 5000,
    defaultCoop: 1852,
    driverBasePay: 800,
  })

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      busId: "",
      driverId: "",
      totalCollection: "",
      dieselCost: "",
      coopContribution: "",
      otherExpenses: "",
      notes: "",
    },
  })

  const watchedValues = form.watch()
  const selectedBus = buses.find((b) => b.id === watchedValues.busId)
  const selectedDriver = drivers.find((d) => d.id === watchedValues.driverId)

  // Check if selected date is Sunday
  const selectedDate = watchedValues.date ? new Date(watchedValues.date) : new Date()
  const isSunday = selectedDate.getDay() === 0

  // Get minimum collection based on day
  const minimumCollection = isSunday ? settings.sundayMinimum : settings.weekdayMinimum

  // Calculate shares automatically
  const grossCollection = parseFloat(watchedValues.totalCollection || "0")
  const dieselCost = parseFloat(watchedValues.dieselCost || "0")
  const coop = parseFloat(watchedValues.coopContribution || "0")
  const expenses = parseFloat(watchedValues.otherExpenses || "0")

  // Use the calculateShares function for automatic computation
  const computation = calculateShares(
    grossCollection,
    dieselCost,
    coop,
    expenses,
    minimumCollection,
    settings.driverBasePay,
    60, // operator share percent
    40  // driver share percent
  )

  useEffect(() => {
    async function fetchData() {
      try {
        const [busesRes, driversRes, settingsRes] = await Promise.all([
          fetch("/api/buses?includeOperator=true"),
          fetch("/api/drivers"),
          fetch("/api/settings"),
        ])

        const busesData = await busesRes.json()
        const driversData = await driversRes.json()
        const settingsData = await settingsRes.json()

        if (busesData.success) setBuses(busesData.data)
        if (driversData.success) setDrivers(driversData.data)

        // Set settings from API
        if (settingsData.success && settingsData.data) {
          const newSettings = {
            weekdayMinimum: parseFloat(settingsData.data[SETTINGS_KEYS.WEEKDAY_MINIMUM_COLLECTION] || "6000"),
            sundayMinimum: parseFloat(settingsData.data[SETTINGS_KEYS.SUNDAY_MINIMUM_COLLECTION] || "5000"),
            defaultCoop: parseFloat(settingsData.data[SETTINGS_KEYS.DEFAULT_COOP_CONTRIBUTION] || "1852"),
            driverBasePay: parseFloat(settingsData.data[SETTINGS_KEYS.DRIVER_BASE_PAY] || "800"),
          }
          setSettings(newSettings)

          // Check if today is Sunday
          const today = new Date()
          if (today.getDay() === 0) {
            form.setValue("coopContribution", "0")
          } else {
            form.setValue("coopContribution", newSettings.defaultCoop.toString())
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load data")
      }
    }
    fetchData()
  }, [form])

  // Watch for date changes and update Coop based on Sunday
  useEffect(() => {
    if (watchedValues.date) {
      const date = new Date(watchedValues.date)
      if (date.getDay() === 0) {
        // Sunday - set coop to 0
        form.setValue("coopContribution", "0")
      } else {
        // Weekday - restore default coop
        form.setValue("coopContribution", settings.defaultCoop.toString())
      }
    }
  }, [watchedValues.date, settings.defaultCoop, form])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      // Recalculate shares for submission
      const submitComputation = calculateShares(
        parseFloat(data.totalCollection),
        parseFloat(data.dieselCost),
        parseFloat(data.coopContribution || "0"),
        parseFloat(data.otherExpenses || "0"),
        minimumCollection,
        settings.driverBasePay,
        60,
        40
      )

      const res = await fetch("/api/daily-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: data.date,
          busId: data.busId,
          driverId: data.driverId,
          totalCollection: parseFloat(data.totalCollection),
          dieselCost: parseFloat(data.dieselCost),
          coopContribution: parseFloat(data.coopContribution || "0"),
          otherExpenses: parseFloat(data.otherExpenses || "0"),
          notes: data.notes || "",
          // Computed values
          minimumCollection: minimumCollection,
          excessCollection: submitComputation.excessCollection,
          driverShare: submitComputation.driverShare,
          assigneeShare: submitComputation.assigneeShare,
        }),
      })

      const result = await res.json()
      if (result.success) {
        toast.success("Daily record saved successfully")
        router.push("/dashboard/daily-records")
      } else {
        toast.error(result.error || "Failed to save record")
      }
    } catch {
      toast.error("Failed to save record")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="New Daily Record" />
      <div className="flex-1 p-4 md:p-6">
        <div className="mb-6">
          <Link href="/dashboard/daily-records">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Records
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Select the date, bus, and driver</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Date
                            {isSunday && (
                              <span className="ml-2 text-xs text-orange-600 font-normal">
                                (Sunday - No Coop)
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="busId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bus</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                      name="driverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Driver</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select driver" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {drivers.map((driver) => (
                                <SelectItem key={driver.id} value={driver.id}>
                                  {driver.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Main Data Entry */}
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Entry</CardTitle>
                    <CardDescription>Enter the collection and costs - shares are computed automatically</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField
                      control={form.control}
                      name="totalCollection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gross Collection</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dieselCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diesel Cost</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="coopContribution"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Coop</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="otherExpenses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Expenses</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Computed Values Display */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calculator className="h-4 w-4" />
                      Auto-Computed Values
                    </CardTitle>
                    <CardDescription>These values are calculated automatically based on the formula</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="rounded-lg bg-background p-3 border">
                        <div className="text-xs text-muted-foreground">Minimum Collection</div>
                        <div className="text-lg font-semibold">{formatCurrency(minimumCollection)}</div>
                        <div className="text-xs text-muted-foreground">{isSunday ? "Sunday rate" : "Weekday rate"}</div>
                      </div>
                      <div className="rounded-lg bg-background p-3 border">
                        <div className="text-xs text-muted-foreground">Extra Collection</div>
                        <div className="text-lg font-semibold text-emerald-600">{formatCurrency(computation.excessCollection)}</div>
                        <div className="text-xs text-muted-foreground">Above minimum</div>
                      </div>
                      <div className="rounded-lg bg-background p-3 border">
                        <div className="text-xs text-muted-foreground">Driver Wage</div>
                        <div className="text-lg font-semibold text-green-600">{formatCurrency(computation.driverShare)}</div>
                        <div className="text-xs text-muted-foreground">Base {formatCurrency(settings.driverBasePay)} + 40% extra</div>
                      </div>
                      <div className="rounded-lg bg-background p-3 border">
                        <div className="text-xs text-muted-foreground">Assignee Share</div>
                        <div className="text-lg font-semibold text-blue-600">{formatCurrency(computation.assigneeShare)}</div>
                        <div className="text-xs text-muted-foreground">60% of extra</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea placeholder="Any notes for this record..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "Saving..." : "Save Record"}
                  </Button>
                  <Link href="/dashboard/daily-records">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedBus && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-sm text-muted-foreground">Operator/Assignee</div>
                    <div className="font-medium">{selectedBus.operator?.name || "No operator"}</div>
                  </div>
                )}

                {selectedDriver && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-sm text-muted-foreground">Driver</div>
                    <div className="font-medium">{selectedDriver.name}</div>
                  </div>
                )}

                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Gross Collection</span>
                    <span className="font-medium">{formatCurrency(grossCollection)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Minimum</span>
                    <span className="font-medium">{formatCurrency(minimumCollection)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Extra</span>
                    <span className="font-medium">{formatCurrency(computation.excessCollection)}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="text-sm font-medium text-muted-foreground">Deductions</div>
                  <div className="flex justify-between text-sm">
                    <span>Diesel Cost</span>
                    <span className="text-red-600">-{formatCurrency(dieselCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Coop</span>
                    <span className="text-red-600">-{formatCurrency(coop)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Other Expenses</span>
                    <span className="text-red-600">-{formatCurrency(expenses)}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="text-sm font-medium text-muted-foreground">Share Distribution</div>
                  <div className="flex justify-between text-sm">
                    <span>Driver Wage</span>
                    <span className="font-bold text-green-600">{formatCurrency(computation.driverShare)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Assignee Share</span>
                    <span className="font-bold text-blue-600">{formatCurrency(computation.assigneeShare)}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="font-bold">Net Balance</span>
                    <span className={`text-xl font-bold ${computation.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(computation.netIncome)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Should be close to ₱0.00 if formula is correct
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
