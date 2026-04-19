// e2e/core/records.spec.js
// Core record operations — list, create, detail, field editing, CSRF.
const { test, expect } = require('@playwright/test');
const { login } = require('../fixtures/auth');

test.describe('People list', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@talentos.io', 'Admin1234!');
    // Confirm we're past the login screen before each test
    await page.locator('button, a, span').filter({ hasText: 'Dashboard' })
      .first().waitFor({ state: 'visible', timeout: 10000 });
  });

  test('People list loads without crash', async ({ page }) => {
    // Navigate to People by clicking any element with that text in the sidebar
    await page.locator('button, a').filter({ hasText: /^People$/ }).first().click({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Something should be visible — list, empty state, or heading
    const content = await page.locator('table, h1, h2, [role="main"]').first().isVisible({ timeout: 10000 }).catch(() => false);
    expect(content).toBe(true);
  });

  test('New Record button is present on People page', async ({ page }) => {
    await page.locator('button, a').filter({ hasText: /^People$/ }).first().click({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // The New button exists somewhere on the page
    const newBtn = page.locator('button').filter({ hasText: /New|Add/ }).first();
    await expect(newBtn).toBeVisible({ timeout: 8000 });
  });
});

// Regression: nav objects (People, Jobs etc.) were disappearing after
// navigating to a record — caused by fetchEnvs retry calling setSelectedEnv
// with a new object reference on every attempt, triggering loadNavObjects
// which could return [] mid-flight and wipe the sidebar.
test.describe('Nav stability', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@talentos.io', 'Admin1234!');
    await page.locator('button, a, span').filter({ hasText: 'Dashboard' })
      .first().waitFor({ state: 'visible', timeout: 10000 });
  });

  test('nav objects remain visible after opening a record', async ({ page }) => {
    // Go to People list
    await page.locator('nav button, nav a').filter({ hasText: /^People$/ }).first().click();
    await page.waitForLoadState('networkidle');

    // Click the first record name link
    const firstRow = page.locator('table tbody tr').first();
    const nameLink = firstRow.locator('a, button').first();
    await nameLink.click({ timeout: 8000 });
    await page.waitForLoadState('networkidle');

    // Nav should still show People and Jobs after navigating to the record
    const peopleNav = page.locator('nav button, nav a').filter({ hasText: /^People$/ }).first();
    const jobsNav   = page.locator('nav button, nav a').filter({ hasText: /^Jobs$/ }).first();
    await expect(peopleNav).toBeVisible({ timeout: 5000 });
    await expect(jobsNav).toBeVisible({ timeout: 5000 });
  });

  test('nav objects remain visible after navigating back to list', async ({ page }) => {
    // Open a record then go back — nav must still be intact
    await page.locator('nav button, nav a').filter({ hasText: /^People$/ }).first().click();
    await page.waitForLoadState('networkidle');

    const nameLink = page.locator('table tbody tr').first().locator('a, button').first();
    await nameLink.click({ timeout: 8000 });
    await page.waitForLoadState('networkidle');

    // Navigate back via browser back or breadcrumb
    await page.goBack();
    await page.waitForLoadState('networkidle');

    const peopleNav = page.locator('nav button, nav a').filter({ hasText: /^People$/ }).first();
    await expect(peopleNav).toBeVisible({ timeout: 5000 });
  });
});

test.describe('CSRF protection in browser', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@talentos.io', 'Admin1234!');
    await page.locator('button, a, span').filter({ hasText: 'Dashboard' })
      .first().waitFor({ state: 'visible', timeout: 10000 });
  });

  test('mutation without CSRF token → 403', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/records', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object_id: 'test', environment_id: 'test', data: {} }),
      });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    });

    expect(result.status).toBe(403);
    expect(result.body.code).toBe('CSRF_MISSING');
  });

  test('mutation WITH correct CSRF token → not 403', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const csrf = document.cookie.match(/vercentic_csrf=([^;]+)/)?.[1];
      if (!csrf) return { status: 0, error: 'no CSRF cookie found' };

      const r = await fetch('/api/records', {
        method:      'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token':  csrf,
        },
        body: JSON.stringify({ object_id: 'bad-uuid', environment_id: 'bad', data: {} }),
      });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    });

    // 400 = Zod validation rejected bad UUIDs — CSRF check passed
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(400);
    expect(result.body.code).not.toBe('CSRF_MISSING');
    expect(result.body.code).not.toBe('CSRF_INVALID');
  });
});
