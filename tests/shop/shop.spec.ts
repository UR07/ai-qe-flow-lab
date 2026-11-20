import { test, expect } from '@playwright/test';
test('catalogue, cart and simulated checkout work together', async ({ page }) => {
  const catalogue = page.waitForResponse(response => response.url().endsWith('/products.json'));
  await page.goto('/');
  expect((await catalogue).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Everyday Notebook' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Everyday Notebook to cart' }).click();
  await expect(page.locator('#cart-count')).toHaveText('1');
  await expect(page.locator('#total')).toHaveText('₹450');
  await page.reload();
  await expect(page.locator('#cart-count')).toHaveText('1');
  await page.getByLabel('Name for this demo order').fill('Alex Example');
  await page.getByRole('button', { name: 'Place demo order' }).click();
  await expect(page.getByRole('status')).toHaveText('Demo order placed for Alex Example. No payment was taken.');
  await expect(page.locator('#cart-count')).toHaveText('0');
  const order = await page.evaluate(() => JSON.parse(localStorage.getItem('qe-shop-last-order') || '{}'));
  expect(order.items.notebook).toBe(1);
});
test('an empty cart cannot be checked out', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Name for this demo order').fill('Alex Example');
  await page.getByRole('button', { name: 'Place demo order' }).click();
  await expect(page.getByRole('status')).toHaveText('Add an item to your cart before checkout.');
});
test('a removed product disappears from the cart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Canvas Tote to cart' }).click();
  await page.getByRole('button', { name: 'Remove Canvas Tote' }).click();
  await expect(page.locator('#cart-items')).toContainText('Your cart is empty.');
});
