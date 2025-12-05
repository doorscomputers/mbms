import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/fix-operator-name - Fix BAMAPMCOM to BAMAPCOM (also accepts POST)
export async function GET() {
  return fixOperatorName()
}

export async function POST() {
  return fixOperatorName()
}

async function fixOperatorName() {
  try {
    // Find and update the operator with typo
    const updated = await prisma.operator.updateMany({
      where: {
        name: 'BAMAPMCOM'
      },
      data: {
        name: 'BAMAPCOM'
      }
    })

    if (updated.count > 0) {
      return NextResponse.json({
        success: true,
        message: `Fixed ${updated.count} operator(s): BAMAPMCOM -> BAMAPCOM`
      })
    } else {
      return NextResponse.json({
        success: true,
        message: 'No operator named BAMAPMCOM found (may already be fixed)'
      })
    }
  } catch (error) {
    console.error('Error fixing operator name:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fix operator name' },
      { status: 500 }
    )
  }
}
