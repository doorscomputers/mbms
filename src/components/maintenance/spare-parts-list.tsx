"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { formatCurrency } from "@/lib/types"
import { AddSparePartDialog, SparePartItem } from "./add-spare-part-dialog"

interface SparePartsListProps {
  busId: string
  spareParts: SparePartItem[]
  onAddPart: (part: SparePartItem) => void
  onRemovePart: (partId: string) => void
}

export function SparePartsList({ busId, spareParts, onAddPart, onRemovePart }: SparePartsListProps) {
  const subtotal = spareParts.reduce((sum, part) => sum + part.totalCost, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Spare Parts</h4>
        <AddSparePartDialog busId={busId} onPartAdded={onAddPart} />
      </div>

      {spareParts.length === 0 ? (
        <div className="border border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">
          No spare parts added yet. Click &quot;Add Spare Part&quot; to add parts used in this repair.
        </div>
      ) : (
        <div className="border rounded-md divide-y">
          {/* Desktop view - table */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Part</th>
                  <th className="text-center p-2 font-medium w-16">Qty</th>
                  <th className="text-right p-2 font-medium w-24">Unit Cost</th>
                  <th className="text-right p-2 font-medium w-24">Total</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {spareParts.map((part) => (
                  <tr key={part.id}>
                    <td className="p-2">
                      <div>
                        <span className="font-medium">{part.partName}</span>
                        {part.brand && (
                          <span className="text-muted-foreground ml-1">({part.brand})</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {part.partTypeLabel || part.partType}
                      </div>
                    </td>
                    <td className="p-2 text-center">{part.quantity}</td>
                    <td className="p-2 text-right">{formatCurrency(part.unitCost)}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(part.totalCost)}</td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemovePart(part.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/50">
                <tr>
                  <td colSpan={3} className="p-2 text-right font-medium">Subtotal:</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(subtotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile view - cards */}
          <div className="sm:hidden">
            {spareParts.map((part) => (
              <div key={part.id} className="p-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{part.partName}</span>
                    {part.brand && (
                      <span className="text-xs text-muted-foreground">({part.brand})</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {part.partTypeLabel || part.partType}
                  </div>
                  <div className="text-sm mt-1">
                    {part.quantity} x {formatCurrency(part.unitCost)} = <span className="font-medium">{formatCurrency(part.totalCost)}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => onRemovePart(part.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="p-3 bg-muted/50 flex justify-between font-medium">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
