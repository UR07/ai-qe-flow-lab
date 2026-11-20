import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeEvidence, explainWithOllama } from '../../src/assistant.mjs';
import { renderReport } from '../../src/report.mjs';

const serviceFailure = {
  requestId: 'demo-request-1',
  action: 'Create an Auto policy',
  ui: { message: 'The demo service is temporarily unavailable.' },
  api: { expectedStatus: 201, status: 503 },
  database: { found: false },
  logs: [{ requestId: 'demo-request-1', event: 'policy.service_unavailable', status: 503 }],
};

test('the local model proposes a cautious service hypothesis from correlated evidence', () => {
  const result = analyzeEvidence(serviceFailure);
  assert.equal(result.category, 'service_failure');
  assert.equal(result.method, 'synthetic-nearest-neighbour');
  assert.ok(result.nextChecks.length >= 2);
  assert.match(result.disclaimer, /not a confirmed root cause/i);
});

test('insufficient evidence returns unknown rather than a forced diagnosis', () => {
  const result = analyzeEvidence({ api: {}, database: {}, logs: [] });
  assert.equal(result.category, 'unknown');
});

test('optional local model receives structured evidence and untrusted-data instructions', async () => {
  let sent;
  const fakeFetch = async (url, options) => {
    sent = { url, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ response: 'Check the service logs.' }) };
  };
  const response = await explainWithOllama('test-model', serviceFailure, fakeFetch);
  assert.equal(response, 'Check the service logs.');
  assert.equal(sent.url, 'http://127.0.0.1:11434/api/generate');
  assert.match(sent.body.prompt, /untrusted data/i);
  assert.match(sent.body.prompt, /not a confirmed root cause/i);
});

test('the HTML report escapes evidence and model output', () => {
  const html = renderReport({ ...serviceFailure, action: '<script>alert(1)</script>' }, analyzeEvidence(serviceFailure), '<img src=x onerror=alert(1)>');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
});
