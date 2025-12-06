"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/types"
import { Trash2, CreditCard } from "lucide-react"

interface Payment {
  id: string
  amount: number | string
  datePaid: string
  remarks: string | null
}

interface PayableRecord {
  id: string
  description: string
  amount: number | string
  paidAmount: number | string
  isPaid: boolean
  bus?: { busNumber: string }
}

interface RecordPaymentDialogProps {
  payable: PayableRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentRecorded: () => void
}

export function RecordPaymentDialog({
  payable,
  open,
  onOpenChange,
  onPaymentRecorded,
}: RecordPaymentDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [amount, setAmount] = useState("")
  const [datePaid, setDatePaid] = useState(new Date().toISOString().split("T")[0])
  const [remarks, setRemarks] = useState("")

  // Fetch existing payments when dialog opens
  useEffect(() => {
    if (open && payable) {
      fetchPayments()
      // Reset form
      setAmount("")
      setDatePaid(new Date().toISOString().split("T")[0])
      setRemarks("")
    }
  }, [open, payable])

  const fetchPayments = async () => {
    if (!payable) return
    setLoading(true)
    try {
      const res = await fetch(`/api/payments?accountsPayableId=${payable.id}`)
      const data = await res.json()
      if (data.success) {
        setPayments(data.data)
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payable || !amount || !datePaid) {
      toast.error("Amount and date are required")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountsPayableId: payable.id,
          amount: parseFloat(amount),
          datePaid,
          remarks: remarks || null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success("Payment recorded")
        setAmount("")
        setRemarks("")
        fetchPayments()
        onPaymentRecorded()
      } else {
        toast.error(data.error || "Failed to record payment")
      }
    } catch {
      toast.error("Failed to record payment")
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment?")) return

    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Payment deleted")
        fetchPayments()
        onPaymentRecorded()
      } else {
        toast.error(data.error || "Failed to delete payment")
      }
    } catch {
      toast.error("Failed to delete payment")
    }
  }

  if (!payable) return null

  const totalAmount = typeof payable.amount === "string" ? parseFloat(payable.amount) : payable.amount
  const totalPaid = payments.reduce(
    (sum, p) => sum + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount),
    0
  )
  const balance = totalAmount - totalPaid

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            {payable.description}
            {payable.bus && ` - Bus #${payable.bus.busNumber}`}
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-semibold">{formatCurrency(totalAmount)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="font-semibold text-green-600">{formatCurrency(totalPaid)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Balance</div>
            <div className={`font-semibold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(balance)}
            </div>
          </div>
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Payment History</h4>
            <div className="border rounded-lg divide-y max-h-[150px] overflow-y-auto">
              {payments.map((payment) => (
                <div key={payment.id} className="p-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{formatCurrency(payment.amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(payment.datePaid)}
                      {payment.remarks && ` - ${payment.remarks}`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePayment(payment.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Payment Form */}
        {balance > 0 && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium">Add Payment</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Max: ${balance.toFixed(2)}`}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="datePaid">Date Paid *</Label>
                <Input
                  id="datePaid"
                  type="date"
                  value={datePaid}
                  onChange={(e) => setDatePaid(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes about this payment"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Recording..." : "Record Payment"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmount(balance.toFixed(2))}
              >
                Pay Full Balance
              </Button>
            </div>
          </form>
        )}

        {balance <= 0 && (
          <div className="text-center py-4 text-green-600 font-medium">
            This payable has been fully paid
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
