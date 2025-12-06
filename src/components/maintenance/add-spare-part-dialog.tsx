"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Plus, Loader2, Search } from "lucide-react"
import { QuickAddPartType } from "@/components/quick-add-part-type"
import { formatCurrency } from "@/lib/types"

export interface SparePartItem {
  id: string
  partName: string
  partType: string
  partTypeLabel?: string
  brand?: string
  quantity: number
  unitCost: number
  totalCost: number
  existingPartId?: string
  saveToInventory?: boolean
}

interface PartType {
  code: string
  label: string
}

interface ExistingSparePart {
  id: string
  partName: string
  partType: string
  brand: string | null
  unitCost: number | string
  quantity: number
}

interface AddSparePartDialogProps {
  busId: string
  onPartAdded: (part: SparePartItem) => void
  trigger?: React.ReactNode
}

export function AddSparePartDialog({ busId, onPartAdded, trigger }: AddSparePartDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("existing")
  const [loading, setLoading] = useState(false)

  // Part types
  const [partTypes, setPartTypes] = useState<PartType[]>([])

  // Existing parts search
  const [existingParts, setExistingParts] = useState<ExistingSparePart[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedExistingPart, setSelectedExistingPart] = useState<string>("")
  const [existingQuantity, setExistingQuantity] = useState("1")

  // New part form
  const [partName, setPartName] = useState("")
  const [partType, setPartType] = useState("")
  const [brand, setBrand] = useState("")
  const [unitCost, setUnitCost] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [saveToInventory, setSaveToInventory] = useState(false)

  // Fetch part types on mount
  useEffect(() => {
    async function fetchPartTypes() {
      try {
        const res = await fetch("/api/part-types?seedIfEmpty=true")
        const data = await res.json()
        if (data.success) setPartTypes(data.data)
      } catch (error) {
        console.error("Error fetching part types:", error)
      }
    }
    if (open) fetchPartTypes()
  }, [open])

  // Fetch existing parts when bus changes or dialog opens
  useEffect(() => {
    async function fetchExistingParts() {
      if (!busId) return
      try {
        const res = await fetch(`/api/spare-parts?busId=${busId}&limit=50`)
        const data = await res.json()
        if (data.success) setExistingParts(data.data)
      } catch (error) {
        console.error("Error fetching existing parts:", error)
      }
    }
    if (open && busId) fetchExistingParts()
  }, [open, busId])

  const filteredParts = existingParts.filter(part =>
    part.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.partType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (part.brand && part.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const resetForm = () => {
    setPartName("")
    setPartType("")
    setBrand("")
    setUnitCost("")
    setQuantity("1")
    setSaveToInventory(false)
    setSelectedExistingPart("")
    setExistingQuantity("1")
    setSearchQuery("")
  }

  const handleAddExisting = () => {
    const part = existingParts.find(p => p.id === selectedExistingPart)
    if (!part) {
      toast.error("Please select a spare part")
      return
    }

    const qty = parseInt(existingQuantity) || 1
    const cost = typeof part.unitCost === 'string' ? parseFloat(part.unitCost) : part.unitCost
    const partTypeLabel = partTypes.find(pt => pt.code === part.partType)?.label || part.partType

    const newPart: SparePartItem = {
      id: crypto.randomUUID(),
      partName: part.partName,
      partType: part.partType,
      partTypeLabel,
      brand: part.brand || undefined,
      quantity: qty,
      unitCost: cost,
      totalCost: qty * cost,
      existingPartId: part.id,
    }

    onPartAdded(newPart)
    resetForm()
    setOpen(false)
    toast.success(`Added ${part.partName}`)
  }

  const handleAddNew = async () => {
    if (!partName.trim()) {
      toast.error("Part name is required")
      return
    }
    if (!partType) {
      toast.error("Part type is required")
      return
    }

    const qty = parseInt(quantity) || 1
    const cost = parseFloat(unitCost) || 0
    const partTypeLabel = partTypes.find(pt => pt.code === partType)?.label || partType

    const newPart: SparePartItem = {
      id: crypto.randomUUID(),
      partName: partName.trim(),
      partType,
      partTypeLabel,
      brand: brand.trim() || undefined,
      quantity: qty,
      unitCost: cost,
      totalCost: qty * cost,
      saveToInventory,
    }

    // If saving to inventory, also create the spare part record
    if (saveToInventory && busId) {
      setLoading(true)
      try {
        const res = await fetch("/api/spare-parts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            busId,
            partName: partName.trim(),
            partType,
            brand: brand.trim() || null,
            quantity: qty,
            unitCost: cost,
            purchaseDate: new Date().toISOString().split("T")[0],
          }),
        })
        const result = await res.json()
        if (result.success) {
          newPart.existingPartId = result.data.id
        }
      } catch (error) {
        console.error("Error saving to inventory:", error)
      } finally {
        setLoading(false)
      }
    }

    onPartAdded(newPart)
    resetForm()
    setOpen(false)
    toast.success(`Added ${partName}`)
  }

  const handlePartTypeAdded = (newType: { code: string; label: string }) => {
    setPartTypes(prev => [...prev, newType])
    setPartType(newType.code)
  }

  const selectedPart = existingParts.find(p => p.id === selectedExistingPart)
  const existingTotal = selectedPart
    ? (parseInt(existingQuantity) || 1) * (typeof selectedPart.unitCost === 'string' ? parseFloat(selectedPart.unitCost) : selectedPart.unitCost)
    : 0

  const newTotal = (parseInt(quantity) || 1) * (parseFloat(unitCost) || 0)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" type="button">
            <Plus className="h-4 w-4 mr-1" />
            Add Spare Part
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Spare Part</DialogTitle>
          <DialogDescription>
            Select from inventory or create a new spare part
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">From Inventory</TabsTrigger>
            <TabsTrigger value="new">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 pt-4">
            {!busId ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Please select a bus first to see existing spare parts
              </p>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search parts by name, type, or brand..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="border rounded-md max-h-[200px] overflow-y-auto">
                  {filteredParts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No spare parts found for this bus
                    </p>
                  ) : (
                    <div className="divide-y">
                      {filteredParts.map((part) => {
                        const partTypeLabel = partTypes.find(pt => pt.code === part.partType)?.label || part.partType
                        const cost = typeof part.unitCost === 'string' ? parseFloat(part.unitCost) : part.unitCost
                        return (
                          <label
                            key={part.id}
                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 ${
                              selectedExistingPart === part.id ? 'bg-muted' : ''
                            }`}
                          >
                            <input
                              type="radio"
                              name="existingPart"
                              value={part.id}
                              checked={selectedExistingPart === part.id}
                              onChange={(e) => setSelectedExistingPart(e.target.value)}
                              className="h-4 w-4"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{part.partName}</p>
                              <p className="text-sm text-muted-foreground">
                                {partTypeLabel}{part.brand && ` - ${part.brand}`} - {formatCurrency(cost)}/unit
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {selectedExistingPart && (
                  <div className="grid gap-2">
                    <Label htmlFor="existingQuantity">Quantity</Label>
                    <Input
                      id="existingQuantity"
                      type="number"
                      min="1"
                      value={existingQuantity}
                      onChange={(e) => setExistingQuantity(e.target.value)}
                    />
                    <p className="text-sm font-medium text-right">
                      Total: {formatCurrency(existingTotal)}
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="partName">Part Name *</Label>
              <Input
                id="partName"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="e.g., Brake Pad, Oil Filter"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="partType">Part Type *</Label>
                <QuickAddPartType
                  onPartTypeAdded={handlePartTypeAdded}
                  trigger={
                    <Button variant="ghost" size="sm" type="button" className="h-auto py-0 px-2 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Type
                    </Button>
                  }
                />
              </div>
              <Select value={partType} onValueChange={setPartType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {partTypes.map((type) => (
                    <SelectItem key={type.code} value={type.code}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="brand">Brand (optional)</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Toyota, Bosch"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unitCost">Unit Cost</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>

            <p className="text-sm font-medium text-right">
              Total: {formatCurrency(newTotal)}
            </p>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToInventory}
                onChange={(e) => setSaveToInventory(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Also save to inventory for future reference</span>
            </label>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || (activeTab === "existing" ? !selectedExistingPart : !partName.trim() || !partType)}
            onClick={activeTab === "existing" ? handleAddExisting : handleAddNew}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add to Repair
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
