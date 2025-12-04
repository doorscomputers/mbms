import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { DEFAULT_SETTINGS, SETTINGS_KEYS } from '@/lib/types'

export async function GET() {
  try {
    const settings = await prisma.setting.findMany()

    // Merge with defaults for any missing settings
    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS }
    settings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    return NextResponse.json({ success: true, data: settingsMap })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value, description } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Key and value are required' },
        { status: 400 }
      )
    }

    // Validate the key
    const validKeys = Object.values(SETTINGS_KEYS)
    if (!validKeys.includes(key as (typeof validKeys)[number])) {
      return NextResponse.json(
        { success: false, error: 'Invalid setting key' },
        { status: 400 }
      )
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: String(value), description },
      create: { key, value: String(value), description },
    })

    return NextResponse.json({ success: true, data: setting })
  } catch (error) {
    console.error('Error saving setting:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save setting' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    // Bulk update settings
    const updates: Array<{ key: string; value: string; description?: string }> = body.settings || []

    const validKeys = Object.values(SETTINGS_KEYS)

    const results = await Promise.all(
      updates
        .filter((u) => validKeys.includes(u.key as (typeof validKeys)[number]))
        .map((u) =>
          prisma.setting.upsert({
            where: { key: u.key },
            update: { value: String(u.value), description: u.description },
            create: { key: u.key, value: String(u.value), description: u.description },
          })
        )
    )

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
