import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
export default class EvidenceReporter {
  onTestEnd(test, result) {
    const evidence = result.attachments.find(item => item.name === 'evidence');
    if (result.status !== 'failed' || !evidence?.body) return;
    mkdirSync('artifacts', { recursive: true });
    writeFileSync(join('artifacts', 'failure-evidence.json'), evidence.body);
  }
}
