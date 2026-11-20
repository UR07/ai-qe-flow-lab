# AI QE Flow Lab

A standalone quality-engineering demo connecting browser interactions, API responses, SQLite records and correlated service logs. An interpretable nearest-neighbour matcher suggests an investigation area from a few hand-authored synthetic examples; an optional local Ollama model can explain possible next checks. This is a learning project using fictional data, not a production testing platform.

## Run locally

Install Node.js 24 and run:

```sh
npm ci
npx playwright install chromium
npm start
```

Open http://127.0.0.1:4178 and use fictional names. The app listens only on your computer. Stop it with Ctrl+C before running tests; the tests start their own server on port 4178.

```sh
npm test
npm run demo:failure
```

The first command runs unit and Playwright checks. The second intentionally triggers a simulated 503 and an assertion failure, verifies the captured evidence, and generates `artifacts/investigation.html`. Open that file in a browser. The wrapper returns success only when the expected failure evidence and report exist; a browser or setup error fails the command. Playwright traces and local demo data are ignored by Git.

To add an optional explanation, install and start Ollama separately, download a model, and run `npm run report -- --ollama-model MODEL_NAME`. This sends the captured synthetic evidence to Ollama on `127.0.0.1:11434`. The baseline report does not require Ollama. The optional integration is contract-tested with a mock; a real model is not required for the test suite.

## How it works

The Playwright test submits a policy through the UI and checks the response, database and log using the same request ID. For the failure demo, the server enables a test-only fault, the test captures evidence, and the local matcher compares structured signals with hand-authored examples. Similarity is not calibrated confidence and suggestions are not confirmed root causes. Review the original evidence and use only synthetic data; the report is not designed for confidential production logs. Local database and log files persist until removed manually.

This is independent of the existing `ai-qe-triage` project: it does not use its code, data, or model. Two future project ideas are recorded in `docs/future-projects.md` and are not part of this implementation.

## E-commerce testing targets

Everyday Supply is a fictional e-commerce store at https://ur07-qe-shop.vercel.app. `npm run start:shop` also starts it locally at http://127.0.0.1:4180. Browse the catalogue, add or remove products and place a simulated order. There is no real payment, backend order API, shared database or service log: cart and last order are stored in the current browser. Use fictional names only. The Vercel deployment was uploaded directly and is not automatically updated by GitHub pushes.

`npm run test:shop` runs the store tests locally. To run the same tests against a hosted copy, set `SHOP_URL` to that site's URL, for example in PowerShell: `$env:SHOP_URL='https://example.com'; npm run test:shop`. The checks cover catalogue loading, cart persistence and removal, checkout and an empty cart.

`npm run test:live` separately runs a small browser and API suite against [Automation Exercise](https://automationexercise.com/), a third-party site that publishes practice test cases and APIs. Availability and data may change; these external tests are intentionally separate from the default suite. They do not access that site's database or internal logs.
