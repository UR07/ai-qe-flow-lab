import { test, expect } from '@playwright/test';

// The site explicitly provides these endpoints and pages for automation practice.
test('practice store shows a product and adds it to the cart', async ({ page }) => {
  await page.goto('https://automationexercise.com/products', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'All Products' })).toBeVisible();
  const item = page.locator('.features_items .product-image-wrapper').first();
  await expect(item).toBeVisible();
  const name = (await item.locator('.productinfo p').first().innerText()).trim();
  await item.locator('.productinfo a.add-to-cart').click();
  await expect(page.getByText('Your product has been added to cart.')).toBeVisible();
  await page.getByRole('link', { name: 'View Cart' }).click();
  await expect(page.locator('#cart_info')).toContainText(name);
});

test('practice product API returns a populated catalogue', async ({ request }) => {
  const response = await request.get('https://automationexercise.com/api/productsList');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.responseCode).toBe(200);
  expect(body.products.length).toBeGreaterThan(0);
  expect(body.products[0]).toMatchObject({ id: expect.any(Number), name: expect.any(String) });
});
