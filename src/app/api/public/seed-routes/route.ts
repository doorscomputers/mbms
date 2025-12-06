import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Create default routes
    const routes = [
      { name: 'Trancoville Route', description: 'Trancoville area bus route' },
      { name: 'Aurora Hill Route', description: 'Aurora Hill area bus route' },
      { name: 'BGH Route', description: 'Baguio General Hospital area bus route' },
    ]

    const createdRoutes = []

    for (const route of routes) {
      const existing = await prisma.route.findUnique({
        where: { name: route.name },
      })

      if (!existing) {
        const created = await prisma.route.create({
          data: route,
        })
        createdRoutes.push(created)
      } else {
        createdRoutes.push(existing)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Routes processed: ${createdRoutes.length}`,
      data: createdRoutes,
    })
  } catch (error) {
    console.error('Error seeding routes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to seed routes' },
      { status: 500 }
    )
  }
}
