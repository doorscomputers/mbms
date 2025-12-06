import { Decimal } from '@prisma/client/runtime/library'

// Utility type to convert Decimal to number for client-side use
export type SerializedDecimal<T> = {
  [K in keyof T]: T[K] extends Decimal ? number : T[K]
}

// Settings keys for the application
export const SETTINGS_KEYS = {
  WEEKDAY_MINIMUM_COLLECTION: 'weekday_minimum_collection',
  SUNDAY_MINIMUM_COLLECTION: 'sunday_minimum_collection',
  DEFAULT_COOP_CONTRIBUTION: 'default_coop_contribution',
  DRIVER_BASE_PAY: 'driver_base_pay',
  SUSPENSION_THRESHOLD: 'suspension_threshold',
  // Deprecated but kept for backwards compatibility
  MINIMUM_COLLECTION: 'minimum_collection',
  DEFAULT_DRIVER_SHARE_PERCENT: 'default_driver_share_percent',
  DEFAULT_ASSIGNEE_SHARE_PERCENT: 'default_assignee_share_percent',
} as const

// Default values
export const DEFAULT_SETTINGS = {
  [SETTINGS_KEYS.WEEKDAY_MINIMUM_COLLECTION]: '6000',
  [SETTINGS_KEYS.SUNDAY_MINIMUM_COLLECTION]: '5000',
  [SETTINGS_KEYS.DEFAULT_COOP_CONTRIBUTION]: '1852',
  [SETTINGS_KEYS.DRIVER_BASE_PAY]: '800',
  [SETTINGS_KEYS.SUSPENSION_THRESHOLD]: '3',
  [SETTINGS_KEYS.MINIMUM_COLLECTION]: '6000',
  [SETTINGS_KEYS.DEFAULT_DRIVER_SHARE_PERCENT]: '40',
  [SETTINGS_KEYS.DEFAULT_ASSIGNEE_SHARE_PERCENT]: '60',
} as const

// Maintenance type labels
export const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  CHANGE_OIL: 'Change Oil',
  TIRE_REPLACEMENT: 'Tire Replacement',
  BRAKE_SERVICE: 'Brake Service',
  ENGINE_REPAIR: 'Engine Repair',
  TRANSMISSION: 'Transmission',
  ELECTRICAL: 'Electrical',
  AIRCON: 'Aircon',
  BODY_REPAIR: 'Body Repair',
  GENERAL_SERVICE: 'General Service',
  OTHER: 'Other',
}

// Part type labels - DEPRECATED: Use database-stored PartTypeConfig instead
// This is kept as a fallback for backwards compatibility
export const PART_TYPE_LABELS_FALLBACK: Record<string, string> = {
  TIRE: 'Tire',
  BATTERY: 'Battery',
  BRAKE_PAD: 'Brake Pad',
  BRAKE_DISC: 'Brake Disc',
  OIL_FILTER: 'Oil Filter',
  AIR_FILTER: 'Air Filter',
  FUEL_FILTER: 'Fuel Filter',
  SPARK_PLUG: 'Spark Plug',
  BELT: 'Belt',
  HOSE: 'Hose',
  LIGHT_BULB: 'Light Bulb',
  WIPER: 'Wiper',
  MIRROR: 'Mirror',
  SEAT: 'Seat',
  ENGINE_PART: 'Engine Part',
  TRANSMISSION_PART: 'Transmission Part',
  SUSPENSION: 'Suspension',
  WATER_PUMP: 'Water Pump',
  OTHER: 'Other',
}

// Helper to get part type label with fallback
export function getPartTypeLabel(code: string, partTypes?: { code: string; label: string }[]): string {
  if (partTypes) {
    const found = partTypes.find(pt => pt.code === code)
    if (found) return found.label
  }
  return PART_TYPE_LABELS_FALLBACK[code] || code
}

// Expense category labels
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  SPARE_PARTS: 'Spare Parts',
  LABOR: 'Labor Cost',
  MISCELLANEOUS: 'Miscellaneous',
  DIESEL: 'Diesel',
  OTHER: 'Other',
}

// Calculate days since installation/purchase
export function getDaysSince(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffTime = now.getTime() - d.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

// Check if part needs replacement based on expected life
export function needsReplacement(installedDate: Date | string, expectedLifeDays: number | null): boolean {
  if (!expectedLifeDays) return false
  const daysSince = getDaysSince(installedDate)
  return daysSince >= expectedLifeDays
}

// Get replacement status
export function getReplacementStatus(installedDate: Date | string | null, expectedLifeDays: number | null): {
  status: 'good' | 'warning' | 'overdue' | 'unknown'
  daysSince: number | null
  daysRemaining: number | null
} {
  if (!installedDate) {
    return { status: 'unknown', daysSince: null, daysRemaining: null }
  }

  const daysSince = getDaysSince(installedDate)

  if (!expectedLifeDays) {
    return { status: 'unknown', daysSince, daysRemaining: null }
  }

  const daysRemaining = expectedLifeDays - daysSince

  if (daysRemaining < 0) {
    return { status: 'overdue', daysSince, daysRemaining }
  } else if (daysRemaining < 30) {
    return { status: 'warning', daysSince, daysRemaining }
  }

  return { status: 'good', daysSince, daysRemaining }
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Helper to check if a date is Sunday
export function isSunday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.getDay() === 0
}

// Get minimum collection based on day of week
export function getMinimumCollectionForDate(
  date: Date | string,
  weekdayMinimum: number,
  sundayMinimum: number
): number {
  return isSunday(date) ? sundayMinimum : weekdayMinimum
}

// Computation types
export interface DailyComputation {
  totalCollection: number      // Gross collection
  minimumCollection: number    // 6000 (weekday) or 5000 (Sunday)
  excessCollection: number     // EXTRA = totalCollection - minimumCollection
  dieselCost: number
  coopContribution: number     // 0 on Sunday
  driverBasePay: number        // 800
  driverExtraShare: number     // EXTRA × 40%
  driverShare: number          // driverBasePay + driverExtraShare
  operatorExtraShare: number   // EXTRA × 60%
  assigneeShare: number        // min - driverBase - diesel - coop + operatorExtraShare
  // Legacy fields for backwards compatibility
  otherExpenses: number
  netIncome: number
}

/**
 * Calculate shares using the correct formula:
 *
 * EXTRA = Gross Collection - Minimum Collection
 * Driver Share = Driver Base (800) + (EXTRA × 40%)
 * Operator Share = Minimum - Driver Base - Diesel - Coop + (EXTRA × 60%)
 *
 * On Sundays: Minimum = 5000, Coop = 0
 * On Weekdays: Minimum = 6000, Coop = from settings
 */
export function calculateShares(
  totalCollection: number,
  dieselCost: number,
  coopContribution: number,
  otherExpenses: number,
  minimumCollection: number,
  driverBasePay: number = 800,
  operatorSharePercent: number = 60,
  driverSharePercent: number = 40
): DailyComputation {
  // EXTRA = Collection above minimum
  const excessCollection = Math.max(0, totalCollection - minimumCollection)

  // Driver gets base pay + 40% of EXTRA
  const driverExtraShare = excessCollection * (driverSharePercent / 100)
  const driverShare = driverBasePay + driverExtraShare

  // Operator gets: Minimum - DriverBase - Diesel - Coop + 60% of EXTRA
  const operatorExtraShare = excessCollection * (operatorSharePercent / 100)
  const assigneeShare = minimumCollection - driverBasePay - dieselCost - coopContribution + operatorExtraShare

  // Net income is what's left (should be 0 if formula is correct)
  const netIncome = totalCollection - driverShare - assigneeShare - dieselCost - coopContribution - otherExpenses

  return {
    totalCollection,
    minimumCollection,
    excessCollection,
    dieselCost,
    coopContribution,
    driverBasePay,
    driverExtraShare,
    driverShare,
    operatorExtraShare,
    assigneeShare,
    otherExpenses,
    netIncome,
  }
}

// Format currency
export function formatCurrency(amount: number | string | Decimal): string {
  const num = typeof amount === 'string' ? parseFloat(amount) :
              typeof amount === 'number' ? amount :
              parseFloat(amount.toString())
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(num)
}

// Format date
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}
