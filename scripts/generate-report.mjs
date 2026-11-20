import { readFileSync, writeFileSync } from 'node:fs';
import { analyzeEvidence, explainWithOllama } from '../src/assistant.mjs';
import { renderReport } from '../src/report.mjs';
const evidence = JSON.parse(readFileSync('artifacts/failure-evidence.json', 'utf8'));
const analysis = analyzeEvidence(evidence);
const modelIndex = process.argv.indexOf('--ollama-model');
let explanation = '';
if (modelIndex !== -1) {
  if (!process.argv[modelIndex + 1]) throw new Error('Provide an Ollama model name.');
  explanation = await explainWithOllama(process.argv[modelIndex + 1], evidence);
}
writeFileSync('artifacts/investigation.html', renderReport(evidence, analysis, explanation));
writeFileSync('artifacts/analysis.json', JSON.stringify(analysis, null, 2));
console.log('Report created: artifacts/investigation.html');
