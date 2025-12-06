"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Save, RefreshCw, MapPin, Info } from "lucide-react"
import { SETTINGS_KEYS, DEFAULT_SETTINGS } from "@/lib/types"

interface RouteData {
  id: string
  name: string
  description: string | null
  operatorSharePercent: string
  driverSharePercent: string
  weekdayMinimumCollection: string | null
  sundayMinimumCollection: string | null
  defaultCoopContribution: string | null
  driverBasePay: string | null
  suspensionThreshold: number | null
}

export default function RouteSettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [route, setRoute] = useState<RouteData | null>(null)
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    operatorSharePercent: "",
    driverSharePercent: "",
    weekdayMinimumCollection: "",
    sundayMinimumCollection: "",
    defaultCoopContribution: "",
    driverBasePay: "",
    suspensionThreshold: "",
  })

  // Redirect if not ROUTE_ADMIN
  useEffect(() => {
    if (session && session.user?.role !== "ROUTE_ADMIN") {
      router.push("/dashboard/settings")
    }
  }, [session, router])

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch route data and global settings
        const [routesRes, settingsRes] = await Promise.all([
          fetch("/api/routes"),
          fetch("/api/settings"),
        ])

        const routesData = await routesRes.json()
        const settingsData = await settingsRes.json()

        if (settingsData.success) {
          setGlobalSettings(settingsData.data)
        }

        if (routesData.success && routesData.data.length > 0) {
          const routeData = routesData.data[0]
          setRoute(routeData)
          setFormData({
            operatorSharePercent: routeData.operatorSharePercent || "60",
            driverSharePercent: routeData.driverSharePercent || "40",
            weekdayMinimumCollection: routeData.weekdayMinimumCollection || "",
            sundayMinimumCollection: routeData.sundayMinimumCollection || "",
            defaultCoopContribution: routeData.defaultCoopContribution || "",
            driverBasePay: routeData.driverBasePay || "",
            suspensionThreshold: routeData.suspensionThreshold?.toString() || "",
          })
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.role === "ROUTE_ADMIN") {
      fetchData()
    }
  }, [session])

  const handleSave = async () => {
    if (!route) return

    setSaving(true)
    try {
      const res = await fetch(`/api/routes/${route.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorSharePercent: parseFloat(formData.operatorSharePercent) || 60,
          driverSharePercent: parseFloat(formData.driverSharePercent) || 40,
          weekdayMinimumCollection: formData.weekdayMinimumCollection ? parseFloat(formData.weekdayMinimumCollection) : null,
          sundayMinimumCollection: formData.sundayMinimumCollection ? parseFloat(formData.sundayMinimumCollection) : null,
          defaultCoopContribution: formData.defaultCoopContribution ? parseFloat(formData.defaultCoopContribution) : null,
          driverBasePay: formData.driverBasePay ? parseFloat(formData.driverBasePay) : null,
          suspensionThreshold: formData.suspensionThreshold ? parseInt(formData.suspensionThreshold) : null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Settings saved successfully")
      } else {
        toast.error(data.error || "Failed to save settings")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const getGlobalDefault = (key: string) => {
    return globalSettings[key] || DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] || ""
  }

  if (session?.user?.role !== "ROUTE_ADMIN") {
    return null
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Route Settings" />
        <div className="flex-1 p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  if (!route) {
    return (
      <div className="flex flex-col">
        <Header title="Route Settings" />
        <div className="flex-1 p-4 md:p-6">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No route assigned to your account
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Route Settings" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {route.name}
              </CardTitle>
              <CardDescription>
                Configure settings for your route. Empty values will use global defaults.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Share Percentages</CardTitle>
              <CardDescription>
                Set the default share percentages for operators and drivers in this route
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="operatorShare">Operator Share (%)</Label>
                  <Input
                    id="operatorShare"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.operatorSharePercent}
                    onChange={(e) =>
                      setFormData({ ...formData, operatorSharePercent: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverShare">Driver Share (%)</Label>
                  <Input
                    id="driverShare"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.driverSharePercent}
                    onChange={(e) =>
                      setFormData({ ...formData, driverSharePercent: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Collection Settings</CardTitle>
              <CardDescription>
                Override global defaults for minimum collection amounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="weekdayMin">Weekday Minimum Collection (PHP)</Label>
                  <Input
                    id="weekdayMin"
                    type="number"
                    step="0.01"
                    placeholder={`Global: ${getGlobalDefault(SETTINGS_KEYS.WEEKDAY_MINIMUM_COLLECTION)}`}
                    value={formData.weekdayMinimumCollection}
                    onChange={(e) =>
                      setFormData({ ...formData, weekdayMinimumCollection: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Leave empty to use global default
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sundayMin">Sunday Minimum Collection (PHP)</Label>
                  <Input
                    id="sundayMin"
                    type="number"
                    step="0.01"
                    placeholder={`Global: ${getGlobalDefault(SETTINGS_KEYS.SUNDAY_MINIMUM_COLLECTION)}`}
                    value={formData.sundayMinimumCollection}
                    onChange={(e) =>
                      setFormData({ ...formData, sundayMinimumCollection: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Leave empty to use global default
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coopContribution">Default Coop Contribution (PHP)</Label>
                  <Input
                    id="coopContribution"
                    type="number"
                    step="0.01"
                    placeholder={`Global: ${getGlobalDefault(SETTINGS_KEYS.DEFAULT_COOP_CONTRIBUTION)}`}
                    value={formData.defaultCoopContribution}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultCoopContribution: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Leave empty to use global default
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driverBasePay">Driver Base Pay (PHP)</Label>
                  <Input
                    id="driverBasePay"
                    type="number"
                    step="0.01"
                    placeholder={`Global: ${getGlobalDefault(SETTINGS_KEYS.DRIVER_BASE_PAY)}`}
                    value={formData.driverBasePay}
                    onChange={(e) =>
                      setFormData({ ...formData, driverBasePay: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Leave empty to use global default
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anomaly Detection</CardTitle>
              <CardDescription>
                Settings for driver performance tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="suspensionThreshold">Suspension Threshold (Days)</Label>
                <Input
                  id="suspensionThreshold"
                  type="number"
                  min="1"
                  max="30"
                  placeholder={`Global: ${getGlobalDefault(SETTINGS_KEYS.SUSPENSION_THRESHOLD)}`}
                  value={formData.suspensionThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, suspensionThreshold: e.target.value })
                  }
                  className="max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Number of &quot;Below Minimum Collection&quot; days before a driver qualifies for suspension review
                </p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}
