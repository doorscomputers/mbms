import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: {
        bus: { include: { operator: true } },
      },
    })

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Maintenance record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error fetching maintenance record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance record' },
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
      busId,
      date,
      maintenanceType,
      description,
      sparePartsCost,
      laborCost,
      miscellaneousCost,
      totalCost,
      odometerReading,
      serviceProvider,
      mechanicName,
      remarks,
      nextServiceDate,
      nextServiceOdometer,
      notes,
      sparePartsData,
    } = body

    // Calculate total if individual costs provided
    const partsC = sparePartsCost !== undefined ? parseFloat(sparePartsCost) : undefined
    const laborC = laborCost !== undefined ? parseFloat(laborCost) : undefined
    const miscC = miscellaneousCost !== undefined ? parseFloat(miscellaneousCost) : undefined
    const calculatedTotal = totalCost !== undefined ? parseFloat(totalCost) :
      (partsC !== undefined || laborC !== undefined || miscC !== undefined) ?
      (partsC || 0) + (laborC || 0) + (miscC || 0) : undefined

    const record = await prisma.maintenanceRecord.update({
      where: { id },
      data: {
        busId,
        date: date ? new Date(date) : undefined,
        maintenanceType,
        description: description || null,
        sparePartsCost: partsC,
        laborCost: laborC,
        miscellaneousCost: miscC,
        totalCost: calculatedTotal,
        sparePartsData: sparePartsData !== undefined ? sparePartsData : undefined,
        odometerReading: odometerReading ? parseFloat(odometerReading) : null,
        serviceProvider: serviceProvider || null,
        mechanicName: mechanicName || null,
        remarks: remarks || null,
        nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
        nextServiceOdometer: nextServiceOdometer ? parseFloat(nextServiceOdometer) : null,
        notes: notes || null,
      },
      include: {
        bus: { include: { operator: true } },
      },
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error: unknown) {
    console.error('Error updating maintenance record:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update maintenance record' },
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
    await prisma.maintenanceRecord.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Record deleted' })
  } catch (error: unknown) {
    console.error('Error deleting maintenance record:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete maintenance record' },
      { status: 500 }
    )
  }
}
