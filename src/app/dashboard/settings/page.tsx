"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Save, RefreshCw } from "lucide-react"
import { SETTINGS_KEYS } from "@/lib/types"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (data.success) {
          setSettings(data.data)
        }
      } catch (error) {
        console.error("Error fetching settings:", error)
        toast.error("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
      }))

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updates }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Settings saved successfully")
      } else {
        toast.error("Failed to save settings")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Settings" />
        <div className="flex-1 p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Settings" />
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Values</CardTitle>
              <CardDescription>
                Configure default values used when creating new daily records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="weekdayMinCollection">Weekday Minimum Collection (PHP)</Label>
                  <Input
                    id="weekdayMinCollection"
                    type="number"
                    step="0.01"
                    value={settings[SETTINGS_KEYS.WEEKDAY_MINIMUM_COLLECTION] || "6000"}
                    onChange={(e) =>
                      updateSetting(SETTINGS_KEYS.WEEKDAY_MINIMUM_COLLECTION, e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum collection for Monday-Saturday
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sundayMinCollection">Sunday Minimum Collection (PHP)</Label>
                  <Input
                    id="sundayMinCollection"
                    type="number"
                    step="0.01"
                    value={settings[SETTINGS_KEYS.SUNDAY_MINIMUM_COLLECTION] || "5000"}
                    onChange={(e) =>
                      updateSetting(SETTINGS_KEYS.SUNDAY_MINIMUM_COLLECTION, e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum collection for Sundays (no coop)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driverBasePay">Driver Base Pay (PHP)</Label>
                  <Input
                    id="driverBasePay"
                    type="number"
                    step="0.01"
                    value={settings[SETTINGS_KEYS.DRIVER_BASE_PAY] || "800"}
                    onChange={(e) =>
                      updateSetting(SETTINGS_KEYS.DRIVER_BASE_PAY, e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Fixed driver base pay per day
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coopContribution">Default Coop Contribution (PHP)</Label>
                  <Input
                    id="coopContribution"
                    type="number"
                    step="0.01"
                    value={settings[SETTINGS_KEYS.DEFAULT_COOP_CONTRIBUTION] || "1852"}
                    onChange={(e) =>
                      updateSetting(SETTINGS_KEYS.DEFAULT_COOP_CONTRIBUTION, e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Coop contribution for weekdays (0 on Sundays)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driverShare">Driver Extra Share (%)</Label>
                  <Input
                    id="driverShare"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settings[SETTINGS_KEYS.DEFAULT_DRIVER_SHARE_PERCENT] || "40"}
                    onChange={(e) =>
                      updateSetting(SETTINGS_KEYS.DEFAULT_DRIVER_SHARE_PERCENT, e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Driver&apos;s percentage of EXTRA collection
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigneeShare">Operator Extra Share (%)</Label>
                  <Input
                    id="assigneeShare"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settings[SETTINGS_KEYS.DEFAULT_ASSIGNEE_SHARE_PERCENT] || "60"}
                    onChange={(e) =>
                      updateSetting(SETTINGS_KEYS.DEFAULT_ASSIGNEE_SHARE_PERCENT, e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Operator&apos;s percentage of EXTRA collection
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Mini Bus Management System (MBMS)</strong>
              </p>
              <p>Version 1.0.0</p>
              <p>
                A comprehensive system for managing mini bus operations including cash
                collections, diesel consumption, driver assignments, maintenance tracking,
                and spare parts inventory.
              </p>
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
