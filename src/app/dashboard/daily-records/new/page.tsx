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
import { formatCurrency, calculateShares } from "@/lib/types"
import { ArrowLeft, Calculator } from "lucide-react"
import Link from "next/link"

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  busId: z.string().min(1, "Bus is required"),
  driverId: z.string().min(1, "Driver is required"),
  totalCollection: z.string().min(1, "Collection amount is required"),
  dieselLiters: z.string().optional(),
  dieselCost: z.string().optional(),
  tripCount: z.string().optional(),
  passengerCount: z.string().optional(),
  odometerStart: z.string().optional(),
  odometerEnd: z.string().optional(),
  minimumCollection: z.string().optional(),
  coopContribution: z.string().optional(),
  otherExpenses: z.string().optional(),
  expenseNotes: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface Bus {
  id: string
  busNumber: string
  operator?: { id: string; name: string; sharePercent: number }
}

interface Driver {
  id: string
  name: string
  sharePercent: number
}

export default function NewDailyRecordPage() {
  const router = useRouter()
  const [buses, setBuses] = useState<Bus[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [computation, setComputation] = useState<ReturnType<typeof calculateShares> | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      busId: "",
      driverId: "",
      totalCollection: "",
      dieselLiters: "",
      dieselCost: "",
      tripCount: "",
      passengerCount: "",
      odometerStart: "",
      odometerEnd: "",
      minimumCollection: "6500",
      coopContribution: "0",
      otherExpenses: "0",
      expenseNotes: "",
      notes: "",
    },
  })

  const watchedValues = form.watch()
  const selectedBus = buses.find((b) => b.id === watchedValues.busId)
  const selectedDriver = drivers.find((d) => d.id === watchedValues.driverId)

  useEffect(() => {
    async function fetchData() {
      try {
        const [busesRes, driversRes] = await Promise.all([
          fetch("/api/buses?includeOperator=true"),
          fetch("/api/drivers"),
        ])

        const busesData = await busesRes.json()
        const driversData = await driversRes.json()

        if (busesData.success) setBuses(busesData.data)
        if (driversData.success) setDrivers(driversData.data)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load data")
      }
    }
    fetchData()
  }, [])

  // Calculate shares whenever relevant values change
  useEffect(() => {
    const assigneePercent = selectedBus?.operator?.sharePercent || 0
    const driverPercent = selectedDriver?.sharePercent || 0

    const comp = calculateShares(
      parseFloat(watchedValues.totalCollection || "0"),
      parseFloat(watchedValues.dieselCost || "0"),
      parseFloat(watchedValues.coopContribution || "0"),
      parseFloat(watchedValues.otherExpenses || "0"),
      parseFloat(watchedValues.minimumCollection || "6500"),
      assigneePercent,
      driverPercent
    )
    setComputation(comp)
  }, [
    watchedValues.totalCollection,
    watchedValues.dieselCost,
    watchedValues.coopContribution,
    watchedValues.otherExpenses,
    watchedValues.minimumCollection,
    selectedBus,
    selectedDriver,
  ])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch("/api/daily-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await res.json()
      if (result.success) {
        toast.success("Daily record created successfully")
        router.push("/dashboard/daily-records")
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
                      name="driverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Driver</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                <Card>
                  <CardHeader>
                    <CardTitle>Collections & Trips</CardTitle>
                    <CardDescription>Enter the collection and trip details</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="totalCollection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Collection (PHP)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tripCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Trips</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="passengerCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passenger Count</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Diesel Consumption</CardTitle>
                    <CardDescription>Enter fuel consumption details</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField
                      control={form.control}
                      name="dieselLiters"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diesel (Liters)</FormLabel>
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
                          <FormLabel>Diesel Cost (PHP)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="odometerStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Odometer Start</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="odometerEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Odometer End</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Deductions & Expenses</CardTitle>
                    <CardDescription>Enter minimum collection, coop, and other expenses</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="minimumCollection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Collection</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormDescription>Default: 6,500</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="coopContribution"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Coop Contribution</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormDescription>Variable amount for coop</FormDescription>
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

                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="expenseNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expense Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Details about expenses..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>General Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any additional notes..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading}>
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

          {/* Computation Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Share Computation
                </CardTitle>
                <CardDescription>Auto-calculated based on input</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedBus && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-sm text-muted-foreground">Operator/Assignee</div>
                    <div className="font-medium">{selectedBus.operator?.name || "No operator"}</div>
                    <div className="text-sm text-muted-foreground">
                      Share: {selectedBus.operator?.sharePercent || 0}%
                    </div>
                  </div>
                )}

                {selectedDriver && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-sm text-muted-foreground">Driver</div>
                    <div className="font-medium">{selectedDriver.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Share: {selectedDriver.sharePercent}%
                    </div>
                  </div>
                )}

                {computation && (
                  <>
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex justify-between text-sm">
                        <span>Total Collection</span>
                        <span className="font-medium">{formatCurrency(computation.totalCollection)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Minimum Collection</span>
                        <span>{formatCurrency(computation.minimumCollection)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Excess Collection</span>
                        <span className="text-green-600">{formatCurrency(computation.excessCollection)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 border-t pt-4">
                      <div className="text-sm font-medium text-muted-foreground">Deductions</div>
                      <div className="flex justify-between text-sm">
                        <span>Diesel Cost</span>
                        <span className="text-red-600">-{formatCurrency(computation.dieselCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Coop Contribution</span>
                        <span className="text-red-600">-{formatCurrency(computation.coopContribution)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Other Expenses</span>
                        <span className="text-red-600">-{formatCurrency(computation.otherExpenses)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 border-t pt-4">
                      <div className="text-sm font-medium text-muted-foreground">Shares</div>
                      <div className="flex justify-between">
                        <span className="font-medium">Assignee Share</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(computation.assigneeShare)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Driver Share</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(computation.driverShare)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between">
                        <span className="font-bold">Net Income</span>
                        <span
                          className={`text-xl font-bold ${
                            computation.netIncome >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(computation.netIncome)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
