import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { startServer } from '../../src/server.mjs';

async function withServer(run) {
  const dir = mkdtempSync(join(tmpdir(), 'qe-flow-test-'));
  const dbPath = join(dir, 'policies.sqlite');
  const logPath = join(dir, 'service.ndjson');
  const app = await startServer({ port: 0, dbPath, logPath, enableFaults: true });
  try {
    await run({ base: `http://127.0.0.1:${app.port}`, dbPath, logPath });
  } finally {
    await app.close();
    for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`, logPath]) rmSync(file, { force: true });
    rmdirSync(dir);
  }
}

test('a successful API request stores a policy and writes a correlated log', async () => {
  await withServer(async ({ base, dbPath, logPath }) => {
    const response = await fetch(`${base}/api/policies`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holderName: 'Alex Example', policyType: 'Auto' }),
    });
    assert.equal(response.status, 201);
    const policy = await response.json();
    const requestId = response.headers.get('x-request-id');
    assert.ok(requestId);
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const row = db.prepare('SELECT holder_name, policy_type, request_id FROM policies WHERE id = ?').get(policy.id);
      assert.equal(row.holder_name, 'Alex Example');
      assert.equal(row.policy_type, 'Auto');
      assert.equal(row.request_id, requestId);
    } finally { db.close(); }
    const entries = readFileSync(logPath, 'utf8').trim().split('\n').map(JSON.parse);
    assert.ok(entries.some(entry => entry.requestId === requestId && entry.event === 'policy.created'));
  });
});

test('invalid input and a simulated service error do not create policies', async () => {
  await withServer(async ({ base, dbPath, logPath }) => {
    const invalid = await fetch(`${base}/api/policies`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holderName: '', policyType: 'Auto' }),
    });
    assert.equal(invalid.status, 400);
    const failed = await fetch(`${base}/api/policies`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-fault': 'service-error' },
      body: JSON.stringify({ holderName: 'Taylor Example', policyType: 'Home' }),
    });
    assert.equal(failed.status, 503);
    const requestId = failed.headers.get('x-request-id');
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try { assert.equal(db.prepare('SELECT COUNT(*) AS count FROM policies').get().count, 0); }
    finally { db.close(); }
    const entries = readFileSync(logPath, 'utf8').trim().split('\n').map(JSON.parse);
    assert.ok(entries.some(entry => entry.requestId === requestId && entry.event === 'policy.service_unavailable'));
  });
});
