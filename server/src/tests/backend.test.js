import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../app.js';

let server;
let baseUrl;
let authToken;
let testUserId;
let uploadedDocId;

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

test('Health check endpoint returns online status', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'online');
  assert.ok(data.service);
});

test('User registration creates account and returns JWT token', async () => {
  const uniqueEmail = `test_borrower_${Date.now()}@example.com`;
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Aditi Sharma',
      email: uniqueEmail,
      password: 'password123'
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.user.email, uniqueEmail);
  authToken = data.token;
  testUserId = data.user.id;
});

test('Duplicate email registration is rejected with 409 Conflict', async () => {
  const email = `duplicate_${Date.now()}@example.com`;
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User 1', email, password: 'password123' })
  });

  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User 2', email, password: 'password123' })
  });

  assert.equal(res.status, 409);
  const data = await res.json();
  assert.ok(data.error);
});

test('User login succeeds with correct credentials', async () => {
  const email = `login_test_${Date.now()}@example.com`;
  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Rohan Verma', email, password: 'secretpassword' })
  });

  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'secretpassword' })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.user.email, email);
});

test('Protected /auth/me returns 401 when no token is provided', async () => {
  const res = await fetch(`${baseUrl}/auth/me`);
  assert.equal(res.status, 401);
});

test('Protected /auth/me succeeds with valid Bearer token', async () => {
  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.user);
  assert.ok(data.stats);
});

test('Research endpoint returns genuine syllabus evaluation metrics', async () => {
  const res = await fetch(`${baseUrl}/research/models`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.metrics);
  assert.ok(data.metrics.model_comparisons);
  assert.ok(data.metrics.model_comparisons['Logistic Regression']);
  assert.ok(data.metrics.model_comparisons['Support Vector Machine']);
  assert.ok(data.metrics.model_comparisons['CART Decision Tree']);
  assert.ok(data.metrics.model_comparisons['Multinomial Naive Bayes']);
});

test('Documents endpoint rejects unauthenticated access with 401', async () => {
  const res = await fetch(`${baseUrl}/documents`);
  assert.equal(res.status, 401);
});

test('Upload endpoint rejects requests without file with 400 Bad Request', async () => {
  const res = await fetch(`${baseUrl}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.equal(res.status, 400);
});

test('Multi-tenant data isolation: User cannot access another users private document', async () => {
  // Register second user
  const otherEmail = `user2_${Date.now()}@example.com`;
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Sneha Patel', email: otherEmail, password: 'password123' })
  });
  const regData = await regRes.json();
  const tokenUser2 = regData.token;

  // Create a document belonging to User 1 directly in store or via mock
  const { localStore } = await import('../models/store.js');
  const doc = localStore.createDocument({
    owner: testUserId,
    filename: 'private_user1_loan.pdf',
    storagePath: 'dummy/path',
    fileChecksum: 'abc123sha',
    fileSizeBytes: 1234,
    mimeType: 'application/pdf',
    status: 'uploaded'
  });

  const docId = doc._id || doc.id;

  // User 1 accesses their document -> 200
  const u1Res = await fetch(`${baseUrl}/documents/${docId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.equal(u1Res.status, 200);

  // User 2 attempts to access User 1's document -> 403 Forbidden
  const u2Res = await fetch(`${baseUrl}/documents/${docId}`, {
    headers: { Authorization: `Bearer ${tokenUser2}` }
  });
  assert.equal(u2Res.status, 403);
});

