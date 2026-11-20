import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
for (const path of ['artifacts/failure-evidence.json', 'artifacts/investigation.html', 'artifacts/analysis.json']) rmSync(path, { force: true });
const run = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', 'tests/e2e/fault.spec.ts'], { stdio: 'inherit', env: { ...process.env, DEMO_FAULTS: '1' } });
if (run.error || run.status !== 1) throw new Error('Expected the simulated Playwright assertion to fail.');
let evidence;
try { evidence = JSON.parse(readFileSync('artifacts/failure-evidence.json', 'utf8')); } catch { throw new Error('No failure evidence was captured; the test may have failed before reaching the demo.'); }
if (evidence.api?.status !== 503 || evidence.database?.found !== false || !evidence.logs?.some(log => log.requestId === evidence.requestId && log.event === 'policy.service_unavailable')) throw new Error('Expected simulated service failure evidence was not captured.');
const report = spawnSync(process.execPath, ['scripts/generate-report.mjs'], { stdio: 'inherit' });
if (report.status !== 0) process.exit(1);
console.log('Expected failure captured and investigation report generated.');
