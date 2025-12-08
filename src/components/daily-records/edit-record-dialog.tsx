"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, calculateShares } from "@/lib/types"
import { putJson, ApiError } from "@/lib/fetch-utils"
import { toast } from "sonner"

interface BusData {
  id: string
  busNumber: string
}

interface Driver {
  id: string
  name: string
}

interface DailyRecord {
  id: string
  date: string
  busId: string
  driverId: string
  totalCollection: number
  dieselCost: number
  dieselLiters: number
  coopContribution: number
  driverShare: number
  assigneeShare: number
  otherExpenses: number
  tripCount: number
  notes: string | null
}

interface Settings {
  weekdayMinimum: number
  sundayMinimum: number
  defaultCoop: number
  driverBasePay: number
}

interface EditRecordDialogProps {
  record: DailyRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  buses: BusData[]
  drivers: Driver[]
  settings: Settings
  onSaved: () => void
}

export function EditRecordDialog({
  record,
  open,
  onOpenChange,
  buses,
  drivers,
  settings,
  onSaved,
}: EditRecordDialogProps) {
  const [saving, setSaving] = useState(false)

  // Form state
  const [date, setDate] = useState("")
  const [busId, setBusId] = useState("")
  const [driverId, setDriverId] = useState("")
  const [totalCollection, setTotalCollection] = useState(0)
  const [dieselCost, setDieselCost] = useState(0)
  const [dieselLiters, setDieselLiters] = useState(0)
  const [coopContribution, setCoopContribution] = useState(0)
  const [driverShare, setDriverShare] = useState(0)
  const [assigneeShare, setAssigneeShare] = useState(0)
  const [otherExpenses, setOtherExpenses] = useState(0)
  const [tripCount, setTripCount] = useState(0)
  const [notes, setNotes] = useState("")

  // Computed state
  const [isBelowMinimum, setIsBelowMinimum] = useState(false)

  // Load record data when dialog opens
  useEffect(() => {
    if (record && open) {
      setDate(record.date.split("T")[0])
      setBusId(record.busId)
      setDriverId(record.driverId)
      setTotalCollection(record.totalCollection)
      setDieselCost(record.dieselCost)
      setDieselLiters(record.dieselLiters)
      setCoopContribution(record.coopContribution)
      setDriverShare(record.driverShare)
      setAssigneeShare(record.assigneeShare)
      setOtherExpenses(record.otherExpenses)
      setTripCount(record.tripCount)
      setNotes(record.notes || "")
    }
  }, [record, open])

  // Recalculate shares whenever inputs change
  const recalculate = useCallback(() => {
    const dateObj = date ? new Date(date) : new Date()
    const isSunday = dateObj.getDay() === 0
    const minimum = isSunday ? settings.sundayMinimum : settings.weekdayMinimum

    if (totalCollection < minimum && totalCollection > 0) {
      // Below minimum: driver is manual entry, assignee = remainder
      setIsBelowMinimum(true)
      const computed = totalCollection - dieselCost - coopContribution - otherExpenses - driverShare
      setAssigneeShare(computed)
    } else if (totalCollection > 0) {
      // Above minimum: use standard formula
      setIsBelowMinimum(false)
      const result = calculateShares(
        totalCollection,
        dieselCost,
        coopContribution,
        otherExpenses,
        minimum,
        settings.driverBasePay,
        60,
        40
      )
      setDriverShare(result.driverShare)
      setAssigneeShare(result.assigneeShare)
    } else {
      setIsBelowMinimum(false)
      setDriverShare(0)
      setAssigneeShare(0)
    }
  }, [date, totalCollection, dieselCost, coopContribution, otherExpenses, driverShare, settings])

  // Recalculate when relevant values change (except driverShare for below minimum)
  useEffect(() => {
    recalculate()
  }, [date, totalCollection, dieselCost, coopContribution, otherExpenses])

  // For below minimum, recalculate assignee when driver share changes
  useEffect(() => {
    if (isBelowMinimum) {
      const computed = totalCollection - dieselCost - coopContribution - otherExpenses - driverShare
      setAssigneeShare(computed)
    }
  }, [driverShare, isBelowMinimum, totalCollection, dieselCost, coopContribution, otherExpenses])

  const handleSave = async () => {
    if (!record) return

    setSaving(true)
    try {
      await putJson(`/api/daily-records/${record.id}`, {
        date,
        busId,
        driverId,
        totalCollection,
        dieselCost,
        dieselLiters,
        coopContribution,
        driverShare,
        assigneeShare,
        otherExpenses,
        tripCount,
        notes: notes || null,
      })
      toast.success("Record updated successfully")
      onOpenChange(false)
      onSaved()
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to update record"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const dateObj = date ? new Date(date) : new Date()
  const isSunday = dateObj.getDay() === 0
  const minimum = isSunday ? settings.sundayMinimum : settings.weekdayMinimum

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Daily Record</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Date and Bus */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {isSunday && (
                <p className="text-xs text-orange-600">Sunday - Min: {formatCurrency(minimum)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bus">Bus</Label>
              <Select value={busId} onValueChange={setBusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((bus) => (
                    <SelectItem key={bus.id} value={bus.id}>
                      {bus.busNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Driver and Collection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driver">Driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection">Collection</Label>
              <Input
                id="collection"
                type="number"
                value={totalCollection}
                onChange={(e) => setTotalCollection(Number(e.target.value) || 0)}
              />
              {isBelowMinimum && (
                <p className="text-xs text-red-600">Below minimum ({formatCurrency(minimum)})</p>
              )}
            </div>
          </div>

          {/* Diesel Cost and Liters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="diesel">Diesel Cost</Label>
              <Input
                id="diesel"
                type="number"
                value={dieselCost}
                onChange={(e) => setDieselCost(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="liters">Liters</Label>
              <Input
                id="liters"
                type="number"
                step="0.01"
                value={dieselLiters}
                onChange={(e) => setDieselLiters(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Coop and Other Expenses */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coop">Coop Contribution</Label>
              <Input
                id="coop"
                type="number"
                value={coopContribution}
                onChange={(e) => setCoopContribution(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="other">Other Expenses</Label>
              <Input
                id="other"
                type="number"
                value={otherExpenses}
                onChange={(e) => setOtherExpenses(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Driver Share and Assignee Share */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driverShare">
                Driver Share
                {isBelowMinimum && <span className="text-orange-600 ml-1">(manual)</span>}
              </Label>
              <Input
                id="driverShare"
                type="number"
                value={driverShare}
                onChange={(e) => setDriverShare(Number(e.target.value) || 0)}
                disabled={!isBelowMinimum}
                className={!isBelowMinimum ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigneeShare">Assignee Share</Label>
              <Input
                id="assigneeShare"
                type="number"
                value={assigneeShare}
                disabled
                className="bg-muted font-semibold"
              />
            </div>
          </div>

          {/* Trip Count */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trips">Trips</Label>
              <Input
                id="trips"
                type="number"
                value={tripCount}
                onChange={(e) => setTripCount(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Calculation Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Calculation Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Collection: <span className="font-medium">{formatCurrency(totalCollection)}</span></div>
              <div>Minimum: <span className="font-medium">{formatCurrency(minimum)}</span></div>
              <div>- Diesel: <span className="text-orange-600">{formatCurrency(dieselCost)}</span></div>
              <div>- Coop: <span className="text-muted-foreground">{formatCurrency(coopContribution)}</span></div>
              <div>- Other: <span className="text-muted-foreground">{formatCurrency(otherExpenses)}</span></div>
              <div>- Driver: <span className="text-green-600">{formatCurrency(driverShare)}</span></div>
              <div className="col-span-2 pt-2 border-t">
                <span className="font-medium">= Assignee: </span>
                <span className={`font-bold ${assigneeShare < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {formatCurrency(assigneeShare)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
