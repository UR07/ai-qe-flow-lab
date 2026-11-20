import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

test('demonstrate investigation of a simulated failure', async ({ page }, testInfo) => {
  test.skip(process.env.DEMO_FAULTS !== '1', 'Run with npm run demo:failure');
  await page.setExtraHTTPHeaders({ 'x-demo-fault': 'service-error' });
  await page.goto('/');
  await page.getByLabel('Policyholder name').fill('Alex Example');
  const pending = page.waitForResponse(response => response.url().endsWith('/api/policies') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create policy' }).click();
  const response = await pending;
  await expect(page.getByRole('status')).toContainText('unavailable');
  const requestId = response.headers()['x-request-id'];
  const db = new DatabaseSync('artifacts/demo.sqlite', { readOnly: true });
  const row = db.prepare('SELECT id FROM policies WHERE request_id = ?').get(requestId);
  db.close();
  const logs = readFileSync('artifacts/service.ndjson', 'utf8').trim().split('\n').map(line => JSON.parse(line)).filter(log => log.requestId === requestId);
  const evidence = { requestId, action: 'Create an Auto policy', ui: { message: await page.getByRole('status').textContent() }, api: { expectedStatus: 201, status: response.status() }, database: { found: Boolean(row) }, logs };
  await testInfo.attach('evidence', { body: Buffer.from(JSON.stringify(evidence, null, 2)), contentType: 'application/json' });
  expect(response.status(), 'Intentional demo: service should create the policy').toBe(201);
});
