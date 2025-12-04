import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const busId = searchParams.get('busId')

    const where: { busId?: string } = {}
    if (busId) where.busId = busId

    // Get unpaid totals
    const unpaidAgg = await prisma.accountsPayable.aggregate({
      where: { ...where, isPaid: false },
      _sum: { amount: true },
      _count: true,
    })

    // Get paid totals
    const paidAgg = await prisma.accountsPayable.aggregate({
      where: { ...where, isPaid: true },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    })

    // Get by category (unpaid)
    const unpaidByCategory = await prisma.accountsPayable.groupBy({
      by: ['category'],
      where: { ...where, isPaid: false },
      _sum: { amount: true },
      _count: true,
    })

    // Get overdue (unpaid with dueDate in the past)
    const overdue = await prisma.accountsPayable.aggregate({
      where: {
        ...where,
        isPaid: false,
        dueDate: { lt: new Date() },
      },
      _sum: { amount: true },
      _count: true,
    })

    const summary = {
      totalUnpaid: unpaidAgg._sum.amount?.toNumber() || 0,
      unpaidCount: unpaidAgg._count,
      totalPaid: paidAgg._sum.paidAmount?.toNumber() || 0,
      paidCount: paidAgg._count,
      overdueAmount: overdue._sum.amount?.toNumber() || 0,
      overdueCount: overdue._count,
      byCategory: unpaidByCategory.map((cat: { category: string; _sum: { amount: { toNumber: () => number } | null }; _count: number }) => ({
        category: cat.category,
        amount: cat._sum.amount?.toNumber() || 0,
        count: cat._count,
      })),
    }

    return NextResponse.json({ success: true, data: summary })
  } catch (error) {
    console.error('Error fetching AP summary:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch summary' },
      { status: 500 }
    )
  }
}
