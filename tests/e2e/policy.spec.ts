import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

test('UI request, API response, database and log share evidence', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Policyholder name').fill('Alex Example');
  await page.getByLabel('Policy type').selectOption('Auto');
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/policies') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create policy' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const data = await response.json();
  const requestId = response.headers()['x-request-id'];
  expect(data.requestId).toBe(requestId);
  await expect(page.getByRole('status')).toContainText('created');
  const db = new DatabaseSync('artifacts/demo.sqlite', { readOnly: true });
  const row = db.prepare('SELECT holder_name FROM policies WHERE request_id = ?').get(requestId);
  db.close();
  expect(row?.holder_name).toBe('Alex Example');
  const logs = readFileSync('artifacts/service.ndjson', 'utf8').trim().split('\n').map(line => JSON.parse(line));
  expect(logs.some(log => log.requestId === requestId && log.event === 'policy.created')).toBe(true);
});

test('API rejects invalid input', async ({ request }) => {
  const response = await request.post('/api/policies', { data: { holderName: '', policyType: 'Auto' } });
  expect(response.status()).toBe(400);
});
