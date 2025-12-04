import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await prisma.accountsPayable.findUnique({
      where: { id },
      include: {
        bus: { include: { operator: true } },
        maintenance: true,
        sparePart: true,
      },
    })

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error fetching record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch record' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      category,
      description,
      amount,
      dueDate,
      paidAmount,
      isPaid,
      paidDate,
      supplier,
      invoiceNumber,
      notes,
    } = body

    const record = await prisma.accountsPayable.update({
      where: { id },
      data: {
        category,
        description,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        dueDate: dueDate ? new Date(dueDate) : null,
        paidAmount: paidAmount !== undefined ? parseFloat(paidAmount) : undefined,
        isPaid: isPaid !== undefined ? isPaid : undefined,
        paidDate: paidDate ? new Date(paidDate) : null,
        supplier: supplier || null,
        invoiceNumber: invoiceNumber || null,
        notes: notes || null,
      },
      include: {
        bus: { include: { operator: true } },
        maintenance: true,
        sparePart: true,
      },
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error: unknown) {
    console.error('Error updating record:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update record' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.accountsPayable.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Record deleted' })
  } catch (error: unknown) {
    console.error('Error deleting record:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete record' },
      { status: 500 }
    )
  }
}
