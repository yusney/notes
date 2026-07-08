const { test, expect } = require('/home/yusney/app/notes/desktop/node_modules/@playwright/test');

test('basic smoke test', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  console.log('Page title:', title);
  expect(title).toBeTruthy();
});
