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
                  <Label htmlFor="minCollection">Minimum Collection (PHP)</Label>
                  <Input
                    id="minCollection"
                    type="number"
                    step="0.01"
                    value={settings[SETTINGS_KEYS.MINIMUM_COLLECTION] || "6500"}
                    onChange={(e) =>
                      updateSetting(SETTINGS_KEYS.MINIMUM_COLLECTION, e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Default minimum collection threshold
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coopContribution">Default Coop Contribution (PHP)</Label>
                  <Input
                    id="coopContribution"
                    type="number"
                    step="0.01"
                    value={settings[SETTINGS_KEYS.DEFAULT_COOP_CONTRIBUTION] || "0"}
                    onChange={(e) =>
                      updateSetting(SETTINGS_KEYS.DEFAULT_COOP_CONTRIBUTION, e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Default coop contribution amount
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driverShare">Default Driver Share (%)</Label>
                  <Input
                    id="driverShare"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settings[SETTINGS_KEYS.DEFAULT_DRIVER_SHARE_PERCENT] || "0"}
                    onChange={(e) =>
                      updateSetting(SETTINGS_KEYS.DEFAULT_DRIVER_SHARE_PERCENT, e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Default percentage share for drivers
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigneeShare">Default Assignee Share (%)</Label>
                  <Input
                    id="assigneeShare"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settings[SETTINGS_KEYS.DEFAULT_ASSIGNEE_SHARE_PERCENT] || "0"}
                    onChange={(e) =>
                      updateSetting(SETTINGS_KEYS.DEFAULT_ASSIGNEE_SHARE_PERCENT, e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Default percentage share for operators/assignees
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
