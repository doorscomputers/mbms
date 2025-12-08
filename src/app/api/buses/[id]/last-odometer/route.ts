import { NextRequest, NextResponse } from 'next/server'
import prisma, { withRetry } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(
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

    const { id: busId } = await params

    // Get the most recent daily record for this bus with a non-zero odometerEnd
    const lastRecord = await withRetry(() => prisma.dailyRecord.findFirst({
      where: {
        busId,
        odometerEnd: { gt: 0 }
      },
      orderBy: { date: 'desc' },
      select: {
        odometerEnd: true,
        date: true,
      },
    }))

    if (!lastRecord) {
      return NextResponse.json({ success: true, data: null })
    }

    return NextResponse.json({
      success: true,
      data: {
        odometerEnd: Number(lastRecord.odometerEnd),
        date: lastRecord.date.toISOString(),
      }
    })
  } catch (error) {
    console.error('Error fetching last odometer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch last odometer' },
      { status: 500 }
    )
  }
}
