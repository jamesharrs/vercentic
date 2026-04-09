// e2e/clients/_template/smoke.spec.js
// Smoke test template — copy this into each client directory.
// Replace `require('./config')` path stays the same; just edit config.js.
const { test, expect } = require('@playwright/test');
const config = require('./config');

async function login(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(config.email);
  await page.locator('input[type="password"]').fill(config.password);
  await page.locator('button').filter({ hasNotText: /demo|forgot|sso/i }).first().click();
  await page.waitForFunction(
    () => !document.querySelector('input[type="password"]'),
    { timeout: 15000 }
  );
  await page.waitForLoadState('networkidle');
}

test.describe(`${config.tenantSlug} — smoke tests`, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('admin can log in', async ({ page }) => {
    // Already logged in by beforeEach — just verify we're past the login page
    const onLogin = await page.locator('input[type="password"]').isVisible({ timeout: 3000 }).catch(() => false);
    expect(onLogin).toBe(false);
  });

  test('People list loads', async ({ page }) => {
    await page.click('text=People', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    const hasList  = await page.locator('table, [data-testid="records-list"]').isVisible({ timeout: 8000 }).catch(() => false);
    const hasEmpty = await page.locator('text=No records').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasList || hasEmpty).toBe(true);
  });

  // ── Custom field verification ───────────────────────────────────────────────
  if (config.customFields.length > 0) {
    test('custom fields exist on People records', async ({ page }) => {
      await page.click('text=People', { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // Open first record if any exist
      const firstLink = page.locator('table a, td a').first();
      const exists = await firstLink.isVisible({ timeout: 5000 }).catch(() => false);
      if (!exists) { test.skip(); return; }
      await firstLink.click();
      await page.waitForLoadState('networkidle');

      // Check each custom field label is visible in the detail panel
      for (const field of config.customFields) {
        const label = page.locator(`text=${field}, [data-field="${field}"]`).first();
        const visible = await label.isVisible({ timeout: 5000 }).catch(() => false);
        expect(visible, `Custom field "${field}" should be visible`).toBe(true);
      }
    });
  }

  // ── Workflow verification ───────────────────────────────────────────────────
  if (config.workflows.length > 0) {
    test('configured workflows exist in Settings', async ({ page }) => {
      await page.click('text=Settings', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.click('text=Workflows').catch(() => {});
      await page.waitForLoadState('networkidle');

      for (const wf of config.workflows) {
        const visible = await page.locator(`text=${wf}`).isVisible({ timeout: 5000 }).catch(() => false);
        expect(visible, `Workflow "${wf}" should exist`).toBe(true);
      }
    });
  }
});
