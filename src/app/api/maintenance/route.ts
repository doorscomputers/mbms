import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { MaintenanceType, Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const busId = searchParams.get('busId')
    const maintenanceType = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: Prisma.MaintenanceRecordWhereInput = {}

    // Filter by operator if not admin
    if (currentUser?.role !== 'ADMIN' && currentUser?.operatorId) {
      where.bus = { operatorId: currentUser.operatorId }
    }

    if (busId) where.busId = busId
    if (maintenanceType) where.maintenanceType = maintenanceType as MaintenanceType
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const records = await prisma.maintenanceRecord.findMany({
      where,
      include: {
        bus: { include: { operator: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Error fetching maintenance records:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance records' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!busId || !date || !maintenanceType) {
      return NextResponse.json(
        { success: false, error: 'Bus, date, and maintenance type are required' },
        { status: 400 }
      )
    }

    // Calculate total if not provided
    const partsC = parseFloat(sparePartsCost || '0')
    const laborC = parseFloat(laborCost || '0')
    const miscC = parseFloat(miscellaneousCost || '0')
    const calculatedTotal = totalCost ? parseFloat(totalCost) : partsC + laborC + miscC

    const record = await prisma.maintenanceRecord.create({
      data: {
        busId,
        date: new Date(date),
        maintenanceType,
        description: description || null,
        sparePartsCost: partsC,
        laborCost: laborC,
        miscellaneousCost: miscC,
        totalCost: calculatedTotal,
        sparePartsData: sparePartsData || null,
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

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    console.error('Error creating maintenance record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create maintenance record' },
      { status: 500 }
    )
  }
}
