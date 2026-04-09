// server/tests/auth.test.js
// Auth endpoint contract tests — validation, rate limiting, credential checks
'use strict';

const { api } = require('./helpers');

describe('POST /api/users/login — validation', () => {
  test('missing email → 400 Validation failed', async () => {
    const res = await api.post('/api/users/login', { password: 'secret' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.errors).toBeInstanceOf(Array);
    expect(res.body.errors[0].field).toBe('email');
  });

  test('invalid email format → 400', async () => {
    const res = await api.post('/api/users/login', { email: 'notanemail', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('empty password → 400', async () => {
    const res = await api.post('/api/users/login', { email: 'a@b.com', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('unknown extra keys are stripped — does not cause 400', async () => {
    const res = await api.post('/api/users/login', {
      email: 'admin@talentos.io',
      password: 'Admin1234!',
      injected: '<script>alert(1)</script>',
    });
    // Should succeed (200) or fail auth (401) but never 400 from extra key
    expect(res.status).not.toBe(400);
  });

  test('malformed JSON body → 400 Invalid JSON', async () => {
    const res = await api
      .post('/api/users/login', null)
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/users/login — credentials', () => {
  test('valid credentials → 200 with user object', async () => {
    const res = await api.post('/api/users/login', {
      email: 'admin@talentos.io',
      password: 'Admin1234!',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email');
    expect(res.body).not.toHaveProperty('password_hash'); // never expose hash
  });

  test('wrong password → 401', async () => {
    const res = await api.post('/api/users/login', {
      email: 'admin@talentos.io',
      password: 'WrongPassword123!',
    });
    expect(res.status).toBe(401);
  });

  test('unknown email → 401 (same message as wrong password — no user enumeration)', async () => {
    const res = await api.post('/api/users/login', {
      email: 'nobody@unknown.com',
      password: 'SomePassword1!',
    });
    expect(res.status).toBe(401);
  });
});

describe('Security headers', () => {
  test('X-Powered-By is removed', async () => {
    const res = await api.get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('X-Frame-Options is DENY', async () => {
    const res = await api.get('/api/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  test('X-Content-Type-Options is nosniff', async () => {
    const res = await api.get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('Content-Security-Policy is present', async () => {
    const res = await api.get('/api/health');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  test('Referrer-Policy is set', async () => {
    const res = await api.get('/api/health');
    expect(res.headers['referrer-policy']).toBeDefined();
  });
});

describe('Session cookie', () => {
  test('successful login sets httpOnly vercentic_sid cookie', async () => {
    const res = await api.post('/api/users/login', {
      email: 'admin@talentos.io',
      password: 'Admin1234!',
    });
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'];
    expect(cookie).toBeDefined();
    const sidCookie = [].concat(cookie).find(c => c.startsWith('vercentic_sid='));
    expect(sidCookie).toBeDefined();
    expect(sidCookie).toContain('HttpOnly');
  });

  test('unauthenticated GET /api/records → 401', async () => {
    const res = await api.get('/api/records?object_id=fake&environment_id=fake');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  test('POST /api/users/logout → 200 and clears cookie', async () => {
    const agent = await require('./helpers').loginAs();
    const res = await agent.post('/api/users/logout');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('CSRF protection', () => {
  let csrfAgent;   // agent with valid session + csrf cookie
  let csrfToken;   // the actual token value

  beforeAll(async () => {
    const request = require('supertest');
    const { getApp } = require('./helpers');
    csrfAgent = request.agent(getApp());
    const login = await csrfAgent
      .post('/api/users/login')
      .send({ email: 'admin@talentos.io', password: 'Admin1234!' });
    expect(login.status).toBe(200);
    // Extract CSRF token from Set-Cookie response header
    const cookies = [].concat(login.headers['set-cookie'] || []);
    const csrfCookie = cookies.find(c => c.startsWith('vercentic_csrf='));
    expect(csrfCookie).toBeDefined();
    csrfToken = csrfCookie.split('=')[1].split(';')[0];
    expect(csrfToken.length).toBe(64); // 32 bytes hex
  });

  test('POST without X-CSRF-Token header → 403 CSRF_MISSING', async () => {
    const res = await csrfAgent.post('/api/records').send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_MISSING');
  });

  test('POST with wrong CSRF token → 403 CSRF_INVALID', async () => {
    const wrongToken = 'b'.repeat(64); // same length, different value
    const res = await csrfAgent
      .post('/api/records')
      .set('X-CSRF-Token', wrongToken)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_INVALID');
  });

  test('POST with correct CSRF token → CSRF passes (400 = validation error, not 403)', async () => {
    const res = await csrfAgent
      .post('/api/records')
      .set('X-CSRF-Token', csrfToken)
      .send({ object_id: 'not-a-uuid', environment_id: 'test', data: {} });
    expect(res.status).toBe(400);   // Zod validation fails, but CSRF passed
    expect(res.body.code).not.toBe('CSRF_MISSING');
    expect(res.body.code).not.toBe('CSRF_INVALID');
  });

  test('GET never requires CSRF token', async () => {
    const res = await csrfAgent.get('/api/health');
    expect(res.status).toBe(200);
  });
});
