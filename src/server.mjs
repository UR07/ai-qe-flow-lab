import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = fileURLToPath(new URL('..', import.meta.url));
const publicDir = join(root, 'public');
const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 16384) throw new Error('Request body is too large.');
  }
  try { return JSON.parse(body); } catch { throw new Error('Request body must be valid JSON.'); }
}

export async function startServer({ port = 4178, dbPath = join(root, 'artifacts', 'demo.sqlite'), logPath = join(root, 'artifacts', 'service.ndjson'), enableFaults = false } = {}) {
  mkdirSync(dirname(dbPath), { recursive: true });
  mkdirSync(dirname(logPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE IF NOT EXISTS policies (id INTEGER PRIMARY KEY AUTOINCREMENT, holder_name TEXT NOT NULL, policy_type TEXT NOT NULL, request_id TEXT NOT NULL)');

  const server = http.createServer(async (req, res) => {
    const requestId = randomUUID();
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    res.setHeader('x-request-id', requestId);
    res.setHeader('cache-control', 'no-store');
    const send = (status, body, event, extra = {}) => {
      appendFileSync(logPath, `${JSON.stringify({ time: new Date().toISOString(), requestId, event, status, ...extra })}\n`);
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method === 'GET' && staticFiles.has(pathname)) {
        const [file, contentType] = staticFiles.get(pathname);
        res.writeHead(200, { 'content-type': contentType, 'content-security-policy': "default-src 'self'; style-src 'self'; script-src 'self'" });
        res.end(readFileSync(join(publicDir, file)));
        return;
      }
      if (pathname === '/api/policies' && req.method === 'GET') {
        const policies = db.prepare('SELECT id, holder_name AS holderName, policy_type AS policyType, request_id AS requestId FROM policies ORDER BY id DESC LIMIT 30').all();
        send(200, { policies }, 'policy.listed');
        return;
      }
      if (pathname === '/api/policies' && req.method === 'POST') {
        let input;
        try { input = await readJson(req); }
        catch (error) { send(400, { error: error.message }, 'policy.validation_rejected'); return; }
        const holderName = typeof input?.holderName === 'string' ? input.holderName.trim() : '';
        const policyType = input?.policyType;
        if (!holderName || holderName.length > 80 || !['Auto', 'Home'].includes(policyType)) {
          send(400, { error: 'Enter a name and choose Auto or Home.' }, 'policy.validation_rejected');
          return;
        }
        if (enableFaults && req.headers['x-demo-fault'] === 'service-error') {
          send(503, { error: 'The demo service is temporarily unavailable.' }, 'policy.service_unavailable');
          return;
        }
        const record = db.prepare('INSERT INTO policies (holder_name, policy_type, request_id) VALUES (?, ?, ?)').run(holderName, policyType, requestId);
        const id = Number(record.lastInsertRowid);
        send(201, { id, holderName, policyType, requestId }, 'policy.created', { policyId: id });
        return;
      }
      send(404, { error: 'Not found.' }, 'request.not_found');
    } catch {
      if (!res.headersSent) send(500, { error: 'Unexpected demo service error.' }, 'request.failed');
      else res.end();
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return {
    port: server.address().port,
    close: () => new Promise((resolve, reject) => server.close(error => { db.close(); error ? reject(error) : resolve(); })),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = await startServer({ port: Number(process.env.PORT || 4178), enableFaults: process.env.DEMO_FAULTS === '1' });
  console.log(`QE Flow Lab running at http://127.0.0.1:${app.port}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
}
