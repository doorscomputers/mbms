import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const accountsPayableId = searchParams.get('accountsPayableId')

    if (!accountsPayableId) {
      return NextResponse.json(
        { success: false, error: 'accountsPayableId is required' },
        { status: 400 }
      )
    }

    const payments = await prisma.payment.findMany({
      where: { accountsPayableId },
      orderBy: { datePaid: 'desc' },
    })

    return NextResponse.json({ success: true, data: payments })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { accountsPayableId, amount, datePaid, remarks } = body

    if (!accountsPayableId || !amount || !datePaid) {
      return NextResponse.json(
        { success: false, error: 'accountsPayableId, amount, and datePaid are required' },
        { status: 400 }
      )
    }

    // Get the accounts payable record
    const payable = await prisma.accountsPayable.findUnique({
      where: { id: accountsPayableId },
      include: { payments: true },
    })

    if (!payable) {
      return NextResponse.json(
        { success: false, error: 'Accounts payable record not found' },
        { status: 404 }
      )
    }

    // Calculate current total paid
    const currentPaid = payable.payments.reduce(
      (sum, p) => sum + parseFloat(p.amount.toString()),
      0
    )
    const newPaymentAmount = parseFloat(amount)
    const totalAfterPayment = currentPaid + newPaymentAmount
    const totalOwed = parseFloat(payable.amount.toString())

    // Check if payment exceeds balance
    if (totalAfterPayment > totalOwed + 0.01) { // Allow small rounding difference
      return NextResponse.json(
        { success: false, error: `Payment exceeds remaining balance of ${(totalOwed - currentPaid).toFixed(2)}` },
        { status: 400 }
      )
    }

    // Create the payment
    const payment = await prisma.payment.create({
      data: {
        accountsPayableId,
        amount: new Decimal(amount),
        datePaid: new Date(datePaid),
        remarks: remarks || null,
      },
    })

    // Update accounts payable totals
    const isPaid = totalAfterPayment >= totalOwed - 0.01 // Allow small rounding difference
    await prisma.accountsPayable.update({
      where: { id: accountsPayableId },
      data: {
        paidAmount: new Decimal(totalAfterPayment),
        isPaid,
        paidDate: isPaid ? new Date(datePaid) : null,
      },
    })

    return NextResponse.json({ success: true, data: payment }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
