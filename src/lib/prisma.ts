import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Helper to retry database operations on transient connection failures
 * Use this for critical operations that should be retried
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
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
}

export default prisma
