// e2e/fixtures/auth.js
// Shared login helper used by all Playwright specs.
// LoginPage.jsx renders:
//   - input[type="email"]
//   - input[type="password"]
//   - <button>Sign in</button>  (disabled until both fields filled)
// After login the app re-renders in place (no URL change) showing the sidebar.
const { test: base, expect } = require('@playwright/test');

const DEFAULT_EMAIL    = 'admin@talentos.io';
const DEFAULT_PASSWORD = 'Admin1234!';

exports.test = base.extend({
  loggedInPage: async ({ page }, use) => {
    await login(page, DEFAULT_EMAIL, DEFAULT_PASSWORD);
    await use(page);
  },
  credentials: [{ email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }, { option: true }],
});

exports.expect = expect;

async function login(page, email, password) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // If already authenticated the login form won't be visible
  const emailInput = page.locator('input[type="email"]');
  const needsLogin = await emailInput.isVisible({ timeout: 8000 }).catch(() => false);
  if (!needsLogin) return;

  await emailInput.fill(email);
  await page.locator('input[type="password"]').fill(password);

  // Wait for the button to become enabled (both fields filled)
  const signInBtn = page.locator('button').filter({ hasText: 'Sign in' });
  await signInBtn.waitFor({ state: 'visible', timeout: 5000 });
  await signInBtn.click();

  // After login the app re-renders — wait for a sidebar element that only
  // appears when authenticated (e.g. "Dashboard" nav text).
  await page.locator('button, a, span').filter({ hasText: 'Dashboard' })
    .first().waitFor({ state: 'visible', timeout: 15000 });
}

async function logout(page) {
  // Call logout endpoint then clear local session store
  await page.evaluate(async () => {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('talentos_session');
  });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
}

exports.login            = login;
exports.logout           = logout;
exports.DEFAULT_EMAIL    = DEFAULT_EMAIL;
exports.DEFAULT_PASSWORD = DEFAULT_PASSWORD;
