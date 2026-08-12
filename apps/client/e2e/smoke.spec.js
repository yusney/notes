const { test, expect } = require('@playwright/test');

test('basic smoke test', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  console.log('Page title:', title);
  expect(title).toBeTruthy();
});
