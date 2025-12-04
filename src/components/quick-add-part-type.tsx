"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"

interface QuickAddPartTypeProps {
  onPartTypeAdded?: (partType: { code: string; label: string }) => void
  trigger?: React.ReactNode
}

export function QuickAddPartType({ onPartTypeAdded, trigger }: QuickAddPartTypeProps) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) {
      toast.error("Part type label is required")
      return
    }

    setLoading(true)
    try {
      // Generate code from label
      const code = label
        .toUpperCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^A-Z0-9_]/g, "")

      const res = await fetch("/api/part-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, label: label.trim() }),
      })

      const result = await res.json()
      if (result.success) {
        toast.success(`Part type "${label}" added`)
        onPartTypeAdded?.(result.data)
        setLabel("")
        setOpen(false)
      } else {
        toast.error(result.error || "Failed to add part type")
      }
    } catch {
      toast.error("Failed to add part type")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" type="button">
            <Plus className="h-4 w-4 mr-1" />
            Add New Type
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Part Type</DialogTitle>
            <DialogDescription>
              Quickly add a new part type for spare parts tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="label">Part Type Name</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Alternator, Radiator, Clutch Plate"
                autoFocus
              />
              {label && (
                <p className="text-xs text-muted-foreground">
                  Code: {label.toUpperCase().trim().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !label.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Part Type
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
