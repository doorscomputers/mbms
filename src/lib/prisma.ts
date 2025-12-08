import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create base Prisma client
const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Add retry logic for transient connection failures
export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      const maxRetries = 3
      let lastError: unknown

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await query(args)
        } catch (error: unknown) {
          lastError = error

          // Check for connection errors that are worth retrying
          const errorCode = (error as { code?: string })?.code
          const isConnectionError = errorCode === 'P1001' || // Can't reach database server
                                    errorCode === 'P1002' || // Database server timed out
                                    errorCode === 'P1008' || // Operations timed out
                                    errorCode === 'P1017'    // Server closed connection

          if (isConnectionError && attempt < maxRetries - 1) {
            // Exponential backoff: 100ms, 200ms, 400ms
            const delay = 100 * Math.pow(2, attempt)
            console.warn(`Database connection error (${errorCode}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }

          // Not a connection error or max retries reached, throw immediately
          throw error
        }
      }

      throw lastError
    },
  },
})

// Store in global for hot-reload in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma as unknown as PrismaClient
}

export default prisma
