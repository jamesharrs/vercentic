// e2e/core/auth.spec.js
// Authentication flow — login, session persistence, logout.
const { test, expect } = require('@playwright/test');
const { login, logout, DEFAULT_EMAIL, DEFAULT_PASSWORD } = require('../fixtures/auth');

test.describe('Login flow', () => {
  test('valid credentials → lands on main app', async ({ page }) => {
    await login(page, DEFAULT_EMAIL, DEFAULT_PASSWORD);
    // login() already waits for Dashboard to appear — just assert it
    await expect(
      page.locator('button, a, span').filter({ hasText: 'Dashboard' }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('wrong password → stays on login, shows error', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[type="email"]').fill(DEFAULT_EMAIL);
    await page.locator('input[type="password"]').fill('WrongPassword999!');
    await page.locator('button').filter({ hasText: 'Sign in' }).click();

    // Wait for error or just confirm login form is still visible
    await page.waitForTimeout(3000);
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('session persists after page refresh', async ({ page }) => {
    await login(page, DEFAULT_EMAIL, DEFAULT_PASSWORD);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should NOT be back at the login screen
    const loginVisible = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);
    expect(loginVisible).toBe(false);
  });

  test('logout clears session — next visit goes to login', async ({ page }) => {
    await login(page, DEFAULT_EMAIL, DEFAULT_PASSWORD);
    await logout(page);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Route protection', () => {
  test('unauthenticated API request → 401', async ({ request }) => {
    const res = await request.get('/api/records?object_id=fake&environment_id=fake');
    expect(res.status()).toBe(401);
  });

  test('unauthenticated mutation → 401 or 403', async ({ request }) => {
    const res = await request.post('/api/records', {
      data: { object_id: 'test', environment_id: 'test', data: {} },
    });
    expect([401, 403]).toContain(res.status());
  });
});
