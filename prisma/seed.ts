import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create admin user if it doesn't exist
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: 'ADMIN',
      }
    })
    console.log(`Created admin user: ${admin.username} / password: admin123`)
  } else {
    console.log(`Admin user already exists: ${existingAdmin.username}`)
  }

  // Get all operators that don't have a user account yet
  const operatorsWithoutUser = await prisma.operator.findMany({
    where: {
      user: null,
      isActive: true
    }
  })

  console.log(`Found ${operatorsWithoutUser.length} operators without user accounts`)

  // Default password for all operators
  const defaultPassword = 'password123'
  const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10)

  for (const operator of operatorsWithoutUser) {
    // Generate username from operator name (lowercase, replace spaces with dots)
    const username = operator.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '.') // Replace spaces with dots
      .trim()

    try {
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedDefaultPassword,
          name: operator.name,
          role: 'OPERATOR',
          operatorId: operator.id,
        }
      })
      console.log(`Created user for operator "${operator.name}": ${user.username} / password: ${defaultPassword}`)
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        console.log(`User already exists for operator "${operator.name}", skipping...`)
      } else {
        console.error(`Error creating user for operator "${operator.name}":`, error)
      }
    }
  }

  console.log('\nSeed completed!')
  console.log('\n========================================')
  console.log('DEFAULT CREDENTIALS')
  console.log('========================================')
  console.log('Admin:     admin / admin123')
  console.log('Operators: <operator.name> / password123')
  console.log('========================================')
  console.log('\nPlease change passwords after first login!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
