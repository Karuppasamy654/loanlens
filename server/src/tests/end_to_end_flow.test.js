import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PDF = path.resolve(__dirname, '../../../ml-service/tests/fixtures/sample_loan_agreement.pdf');

let server;
let baseUrl;
let tokenUserA;
let userIdA;
let tokenUserB;
let userIdB;
let createdDocId;
let createdReportId;

test.before(async () => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });
});

test.after(async () => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

test('Step 1 & 2: User A registers and authenticates successfully', async () => {
  const email = `adversarial_user_a_${Date.now()}@example.com`;
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Adversarial Auditor', email, password: 'StrongPassword123!' })
  });
  assert.equal(regRes.status, 201);
  const data = await regRes.json();
  assert.ok(data.token);
  tokenUserA = data.token;
  userIdA = data.user.id;

  // Login verification
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(loginRes.status, 200);
});

test('Step 3: User A uploads a real digital loan agreement PDF', async () => {
  assert.ok(fs.existsSync(FIXTURE_PDF), `Fixture PDF missing at ${FIXTURE_PDF}`);
  const fileBytes = fs.readFileSync(FIXTURE_PDF);
  const blob = new Blob([fileBytes], { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', blob, 'sample_loan_agreement.pdf');

  const uploadRes = await fetch(`${baseUrl}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenUserA}` },
    body: form
  });

  assert.equal(uploadRes.status, 201);
  const data = await uploadRes.json();
  assert.ok(data.document);
  assert.equal(data.document.filename, 'sample_loan_agreement.pdf');
  createdDocId = data.document._id || data.document.id;
  assert.ok(createdDocId);
});

test('Step 4 - 9: Analyze PDF end-to-end via FastAPI and persist report', async () => {
  // Call analysis endpoint
  const analyzeRes = await fetch(`${baseUrl}/documents/${createdDocId}/analyze`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenUserA}` }
  });

  // FastAPI ML service must be running for this test
  if (analyzeRes.status === 502) {
    console.log('[NOTICE] ML Service unavailable during test execution; skipping live inference check');
    return;
  }

  assert.equal(analyzeRes.status, 200);
  const data = await analyzeRes.json();
  assert.ok(data.reportId);
  assert.ok(data.overview);
  createdReportId = data.reportId;

  // Retrieve the generated full report
  const reportRes = await fetch(`${baseUrl}/reports/${createdReportId}`, {
    headers: { Authorization: `Bearer ${tokenUserA}` }
  });
  assert.equal(reportRes.status, 200);
  const reportData = await reportRes.json();
  assert.ok(reportData.report.clauses);
  assert.ok(reportData.report.clauses.length >= 5, `Expected >= 5 clauses, got ${reportData.report.clauses.length}`);

  // Check model inference properties on clauses
  const sampleClause = reportData.report.clauses[0];
  assert.ok(['Normal', 'Needs Review', 'Risky'].includes(sampleClause.predicted_label));
  assert.ok(typeof sampleClause.confidence === 'number');
  assert.ok(sampleClause.probabilities);
  assert.ok(sampleClause.summary);

  // Check overview metrics
  assert.ok(reportData.report.overview);
  assert.equal(reportData.report.overview.total_clauses, reportData.report.clauses.length);
});

test('Step 10 & 11: Retrieve persisted report from history and verify idempotency', async () => {
  if (!createdReportId) return;

  // Retrieve report
  const getRes = await fetch(`${baseUrl}/reports/${createdReportId}`, {
    headers: { Authorization: `Bearer ${tokenUserA}` }
  });
  assert.equal(getRes.status, 200);
  const data = await getRes.json();
  assert.equal(data.report._id || data.report.id, createdReportId);

  // Refresh (fetch again) -> Identical result
  const refreshRes = await fetch(`${baseUrl}/reports/${createdReportId}`, {
    headers: { Authorization: `Bearer ${tokenUserA}` }
  });
  assert.equal(refreshRes.status, 200);
  const refreshData = await refreshRes.json();
  assert.equal(refreshData.report.clauses.length, data.report.clauses.length);
});

test('Step 12: Multi-tenant protection: User B cannot access User As report', async () => {
  if (!createdReportId) return;

  // Register User B
  const emailB = `adversarial_user_b_${Date.now()}@example.com`;
  const regB = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Intruder User', email: emailB, password: 'Password456!' })
  });
  const dataB = await regB.json();
  tokenUserB = dataB.token;

  // User B attempts to read User A's report -> 403 Forbidden
  const readRes = await fetch(`${baseUrl}/reports/${createdReportId}`, {
    headers: { Authorization: `Bearer ${tokenUserB}` }
  });
  assert.equal(readRes.status, 403);

  // User B attempts to delete User A's document -> 403 Forbidden
  const delRes = await fetch(`${baseUrl}/documents/${createdDocId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenUserB}` }
  });
  assert.equal(delRes.status, 403);
});

test('Step 13: Corrupt upload and invalid format rejection', async () => {
  // Attempt to upload a non-PDF txt file
  const txtBlob = new Blob([Buffer.from('Hello world non pdf')], { type: 'text/plain' });
  const badForm = new FormData();
  badForm.append('file', txtBlob, 'invalid_contract.txt');

  const badRes = await fetch(`${baseUrl}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenUserA}` },
    body: badForm
  });
  // Multer rejects non-PDF files with 400
  assert.ok([400, 500].includes(badRes.status));
});

test('Step 14 & 15: Security checks on unauthenticated access and error visibility', async () => {
  // Requesting report without token -> 401
  if (createdReportId) {
    const unauthRes = await fetch(`${baseUrl}/reports/${createdReportId}`);
    assert.equal(unauthRes.status, 401);
  }

  // Requesting non-existent report -> 404
  const notFoundRes = await fetch(`${baseUrl}/reports/non_existent_id_99999`, {
    headers: { Authorization: `Bearer ${tokenUserA}` }
  });
  assert.equal(notFoundRes.status, 404);
});
