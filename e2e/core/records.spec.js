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
