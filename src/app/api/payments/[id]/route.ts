import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { Decimal } from '@prisma/client/runtime/library'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get the payment to find its accountsPayableId
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { accountsPayable: { include: { payments: true } } },
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Delete the payment
    await prisma.payment.delete({ where: { id } })

    // Recalculate totals for the accounts payable
    const remainingPayments = payment.accountsPayable.payments.filter(p => p.id !== id)
    const newPaidAmount = remainingPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount.toString()),
      0
    )
    const totalOwed = parseFloat(payment.accountsPayable.amount.toString())
    const isPaid = newPaidAmount >= totalOwed - 0.01

    await prisma.accountsPayable.update({
      where: { id: payment.accountsPayableId },
      data: {
        paidAmount: new Decimal(newPaidAmount),
        isPaid,
        paidDate: isPaid ? new Date() : null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment' },
      { status: 500 }
    )
  }
}
