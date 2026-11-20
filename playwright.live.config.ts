import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/live', workers: 1, retries: 0, timeout: 45000, reporter: 'list', use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' } });
