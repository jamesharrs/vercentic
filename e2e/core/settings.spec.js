// e2e/core/settings.spec.js
// Settings sections — data model, users, roles, appearance, org structure
const { test, expect } = require('@playwright/test');
const { login } = require('../fixtures/auth');

const ADMIN = { email: 'admin@talentos.io', password: 'Admin1234!' };
const T = { timeout: 12000 };

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.locator('button, a').filter({ hasText: /Dashboard|People/ }).first().waitFor({ state: 'visible', ...T });
    // Navigate to Settings
    await page.locator('button, a').filter({ hasText: /Settings/i }).first().click(T);
    await page.waitForTimeout(800);
  });

  test('Settings page loads without crash', async ({ page }) => {
    await expect(page.locator('text="Something went wrong"')).not.toBeVisible();
    const settings = await page.locator('text=/Data Model|Users|Roles|Appearance|Settings/i').first().isVisible(T).catch(() => false);
    expect(settings).toBe(true);
  });

  test('Data Model section opens', async ({ page }) => {
    const dmBtn = page.locator('button, a, li').filter({ hasText: /Data Model/i }).first();
    if (!(await dmBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Data Model not in nav'); return;
    }
    await dmBtn.click();
    await page.waitForTimeout(800);
    await expect(page.locator('text="Something went wrong"')).not.toBeVisible();
    // Should show objects (People, Jobs, Talent Pools)
    const obj = page.locator('text=/People|Jobs|Talent Pool/i').first();
    await expect(obj).toBeVisible(T);
  });

  test('Users section loads', async ({ page }) => {
    const usersBtn = page.locator('button, a, li').filter({ hasText: /^Users$/i }).first();
    if (!(await usersBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Users not in settings nav'); return;
    }
    await usersBtn.click();
    await page.waitForTimeout(800);
    await expect(page.locator('text="Something went wrong"')).not.toBeVisible();
    const userTable = await page.locator('table, text=/admin@vercentic/i').first().isVisible(T).catch(() => false);
    expect(userTable).toBe(true);
  });

  test('Roles section loads', async ({ page }) => {
    const rolesBtn = page.locator('button, a, li').filter({ hasText: /Roles/i }).first();
    if (!(await rolesBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Roles not in settings nav'); return;
    }
    await rolesBtn.click();
    await page.waitForTimeout(800);
    await expect(page.locator('text="Something went wrong"')).not.toBeVisible();
    const role = await page.locator('text=/Admin|Recruiter|Super Admin/i').first().isVisible(T).catch(() => false);
    expect(role).toBe(true);
  });

  test('Appearance section loads', async ({ page }) => {
    const appBtn = page.locator('button, a, li').filter({ hasText: /Appearance/i }).first();
    if (!(await appBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Appearance not in settings nav'); return;
    }
    await appBtn.click();
    await page.waitForTimeout(800);
    await expect(page.locator('text="Something went wrong"')).not.toBeVisible();
  });

  test('Org Structure section loads', async ({ page }) => {
    const orgBtn = page.locator('button, a, li').filter({ hasText: /Org Structure/i }).first();
    if (!(await orgBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Org Structure not in settings nav'); return;
    }
    await orgBtn.click();
    await page.waitForTimeout(800);
    await expect(page.locator('text="Something went wrong"')).not.toBeVisible();
  });

  test('Workflows section loads', async ({ page }) => {
    const wfBtn = page.locator('button, a, li').filter({ hasText: /Workflows/i }).first();
    if (!(await wfBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Workflows not in settings nav'); return;
    }
    await wfBtn.click();
    await page.waitForTimeout(800);
    await expect(page.locator('text="Something went wrong"')).not.toBeVisible();
  });

  test('Audit Log section loads', async ({ page }) => {
    const alBtn = page.locator('button, a, li').filter({ hasText: /Audit Log/i }).first();
    if (!(await alBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Audit Log not in settings nav'); return;
    }
    await alBtn.click();
    await page.waitForTimeout(800);
    await expect(page.locator('text="Something went wrong"')).not.toBeVisible();
  });
});
