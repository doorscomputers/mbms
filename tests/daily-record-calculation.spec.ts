import { test, expect } from '@playwright/test';

/**
 * Test cases based on handwritten ledger (Image #3)
 *
 * Settings:
 * - Weekday minimum: 6000
 * - Sunday minimum: 5000
 * - Driver base pay: 800
 * - Default coop: 1852
 * - Driver share %: 40
 * - Operator share %: 60
 *
 * Formula when ABOVE minimum:
 *   EXTRA = Gross - Minimum
 *   Driver = 800 + (EXTRA * 40%)
 *   Operator = Minimum - 800 - Diesel - Coop + (EXTRA * 60%)
 *
 * Formula when BELOW minimum:
 *   Driver = manual entry (blank/0 initially)
 *   Operator = Gross - Diesel - Coop - Driver
 */

// Helper to login before tests
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[name="username"], input[placeholder*="username" i]', 'admin');
  await page.fill('input[name="password"], input[placeholder*="password" i]', 'admin123');

  // Click sign in button
  await page.click('button:has-text("Sign In")');

  // Wait for navigation to dashboard
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

test.describe('Daily Record Calculation Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Login first
    await login(page);

    // Navigate to the new daily record page
    await page.goto('/dashboard/daily-records/new');
    await page.waitForLoadState('networkidle');
  });

  // Test case: Above minimum weekday
  // Gross: 6300, Diesel: 2277
  // EXTRA = 6300 - 6000 = 300
  // Driver = 800 + (300 * 0.4) = 920
  // Operator = 6000 - 800 - 2277 - 1852 + (300 * 0.6) = 1251
  test('Above minimum weekday - auto-calculates driver and assignee shares', async ({ page }) => {
    // Set date to a Tuesday (not Sunday)
    await page.locator('input[type="date"]').fill('2025-11-18');

    // Wait for date to be processed
    await page.waitForTimeout(300);

    // Enter collection
    await page.locator('input[name="totalCollection"]').fill('6300');

    // Enter diesel cost
    await page.locator('input[name="dieselCost"]').fill('2277');

    // Wait for auto-calculation
    await page.waitForTimeout(500);

    // Should NOT show below minimum warning
    const warningText = page.locator('text=Below Minimum Collection');
    await expect(warningText).not.toBeVisible();

    // Check the computed driver wage in the summary section
    // Look for the text that contains the driver wage value
    const summarySection = page.locator('.sticky');
    const driverWageText = await summarySection.locator('text=Driver Wage').locator('..').textContent();

    // Driver should be ~920 (800 + 120)
    expect(driverWageText).toContain('920');
  });

  // Test case: Below minimum weekday
  // Gross: 5000, Diesel: 2203, Coop: 1852
  // Since 5000 < 6000, driver should be blank for manual entry
  test('Below minimum weekday - shows warning and allows manual driver entry', async ({ page }) => {
    // Set date to a weekday
    await page.locator('input[type="date"]').fill('2025-11-29');

    // Wait for date to be processed
    await page.waitForTimeout(300);

    // Enter values
    await page.locator('input[name="totalCollection"]').fill('5000');
    await page.locator('input[name="dieselCost"]').fill('2203');

    // Wait for UI
    await page.waitForTimeout(500);

    // Should show below minimum warning
    const warningText = page.locator('text=Below Minimum Collection');
    await expect(warningText).toBeVisible();

    // Should show driver wage override input
    const driverOverride = page.locator('input[name="driverWageOverride"]');
    await expect(driverOverride).toBeVisible();

    // Enter manual driver wage
    await driverOverride.fill('600');

    // Wait for recalculation
    await page.waitForTimeout(500);

    // Operator = 5000 - 2203 - 1852 - 600 = 345
    // Check assignee share is calculated
    const summarySection = page.locator('.sticky');
    const assigneeText = await summarySection.locator('text=Assignee Share').locator('..').textContent();
    expect(assigneeText).toContain('345');
  });

  // Test case: Sunday - coop should be 0
  test('Sunday - coop should automatically be 0', async ({ page }) => {
    // Set date to a Sunday
    await page.locator('input[type="date"]').fill('2025-11-23');

    // Wait for date to be processed and coop to update
    await page.waitForTimeout(500);

    // Coop should be 0 on Sunday
    const coopInput = page.locator('input[name="coopContribution"]');
    await expect(coopInput).toHaveValue('0');

    // Should show "(Sunday - No Coop)" indicator
    const sundayIndicator = page.locator('text=Sunday - No Coop');
    await expect(sundayIndicator).toBeVisible();
  });

  // Test case: Sunday below minimum
  // Gross: 4500, Diesel: 2202, Coop: 0 (Sunday)
  // Since 4500 < 5000 (Sunday minimum), driver should be blank
  test('Sunday below minimum - shows warning with coop at 0', async ({ page }) => {
    // Set date to Sunday
    await page.locator('input[type="date"]').fill('2025-11-23');

    // Wait for coop to be set to 0
    await page.waitForTimeout(500);

    // Enter values
    await page.locator('input[name="totalCollection"]').fill('4500');
    await page.locator('input[name="dieselCost"]').fill('2202');

    // Wait for UI
    await page.waitForTimeout(500);

    // Should show below minimum warning (4500 < 5000)
    const warningText = page.locator('text=Below Minimum Collection');
    await expect(warningText).toBeVisible();

    // Coop should still be 0
    const coopInput = page.locator('input[name="coopContribution"]');
    await expect(coopInput).toHaveValue('0');

    // Enter manual driver wage
    await page.locator('input[name="driverWageOverride"]').fill('600');

    // Wait for recalculation
    await page.waitForTimeout(500);

    // Operator = 4500 - 2202 - 0 - 600 = 1698
    const summarySection = page.locator('.sticky');
    const assigneeText = await summarySection.locator('text=Assignee Share').locator('..').textContent();
    expect(assigneeText).toContain('1,698');
  });

  // Test case: Sunday above minimum
  // Gross: 5700, Diesel: 2640, Coop: 0 (Sunday)
  // EXTRA = 5700 - 5000 = 700
  // Driver = 800 + (700 * 0.4) = 1080
  // Operator = 5000 - 800 - 2640 - 0 + (700 * 0.6) = 1980
  test('Sunday above minimum - auto-calculates with coop at 0', async ({ page }) => {
    // Set date to Sunday
    await page.locator('input[type="date"]').fill('2025-11-30');

    // Wait for coop to be set to 0
    await page.waitForTimeout(500);

    // Enter values
    await page.locator('input[name="totalCollection"]').fill('5700');
    await page.locator('input[name="dieselCost"]').fill('2640');

    // Wait for auto-calculation
    await page.waitForTimeout(500);

    // Should NOT show below minimum warning (5700 > 5000)
    const warningText = page.locator('text=Below Minimum Collection');
    await expect(warningText).not.toBeVisible();

    // Check the computed values
    const summarySection = page.locator('.sticky');

    // Driver should be 1080 (800 + 280)
    const driverWageText = await summarySection.locator('text=Driver Wage').locator('..').textContent();
    expect(driverWageText).toContain('1,080');

    // Assignee should be 1980 (1560 + 420)
    const assigneeText = await summarySection.locator('text=Assignee Share').locator('..').textContent();
    expect(assigneeText).toContain('1,980');
  });

  // Test: Very low collection results in negative assignee share
  // Gross: 3400, Diesel: 2240, Coop: 1852, Driver: 0
  // Operator = 3400 - 2240 - 1852 - 0 = -692
  test('Below minimum with very low collection - negative assignee share', async ({ page }) => {
    // Set date to a weekday
    await page.locator('input[type="date"]').fill('2025-02-01');

    // Wait for date processing
    await page.waitForTimeout(300);

    // Enter values
    await page.locator('input[name="totalCollection"]').fill('3400');
    await page.locator('input[name="dieselCost"]').fill('2240');

    // Wait for UI
    await page.waitForTimeout(500);

    // Should show below minimum warning
    const warningText = page.locator('text=Below Minimum Collection');
    await expect(warningText).toBeVisible();

    // Don't enter driver wage (leave at 0)
    // Operator = 3400 - 2240 - 1852 - 0 = -692

    // Check assignee share is negative
    const summarySection = page.locator('.sticky');
    const assigneeText = await summarySection.locator('text=Assignee Share').locator('..').textContent();
    // Should show negative value
    expect(assigneeText).toMatch(/-.*692/);
  });
});
