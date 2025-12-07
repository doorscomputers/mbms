# Fix Below-Minimum Collection Computation

## Problem
When collection is below the minimum quota:
- Weekday minimum: 6000 (variable)
- Sunday minimum: 5000 (variable)

The driver share should NOT be auto-calculated. Instead, it should be blank (0) for the user to manually enter the actual driver wage. The assignee share then becomes:
```
Assignee Share = Collection - Diesel - Coop - Other Expenses - Driver Share
```

On Sundays, Coop is always 0.

## Tasks
- [x] Update `recalculateShares` in `daily-records/page.tsx` to return `isBelowMinimum` flag and set driverShare=0 when below minimum
- [x] Update all `setCellValue` handlers to only auto-set driverShare when above minimum
- [x] Add `setCellValue` handler on driverShare column for manual entry recalculation
- [x] Verify `new/page.tsx` already handles this correctly (it does with driverWageOverride)

## Changes Made

### `src/app/dashboard/daily-records/page.tsx`
1. **Modified `recalculateShares` function:**
   - Added `manualDriverShare` parameter for manual driver share input
   - Returns `isBelowMinimum: true` when collection < minimum
   - When below minimum, uses provided driverShare (or 0) and calculates assignee as remainder

2. **Updated all `setCellValue` handlers:**
   - Date, Collection, Diesel, Coop, OtherExpenses columns now check `isBelowMinimum`
   - Only auto-set driverShare when above minimum
   - Below minimum: driverShare stays at 0 for manual entry, assignee recalculates

3. **Added `setCellValue` on driverShare column:**
   - When user manually enters driver share, assignee share automatically recalculates

### `src/app/dashboard/daily-records/new/page.tsx`
Already had correct behavior:
- Shows warning when collection < minimum
- Driver wage field becomes manual entry
- Assignee share = Collection - Diesel - Coop - Other - DriverWage

## Example Verification (from handwritten ledger)
- 11/29: Gross=5000, Diesel=2203, Driver=600 (manual), Coop=1852
  - Assignee = 5000 - 2203 - 600 - 1852 = 345 (matches ~315 from ledger)
