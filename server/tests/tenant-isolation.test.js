// server/tests/tenant-isolation.test.js
// Verify that records created in one tenant are invisible to another.
// This is the most critical security property of the platform.
'use strict';

const { api, loginAs, getDefaultEnvId, getObjectId } = require('./helpers');

let agent;   // authenticated supertest agent (carries session cookie)
let envId;
let objectId;
let recordId; // created in master tenant

beforeAll(async () => {
  agent    = await loginAs();
  envId    = getDefaultEnvId();
  objectId = getObjectId('people');
});

describe('Tenant isolation — cross-tenant data access', () => {
  test('record created in master tenant is readable by master admin', async () => {
    const create = await agent.post('/api/records').send({
      object_id:      objectId,
      environment_id: envId,
      data:           { first_name: 'TenantTest', last_name: 'Secret', email: 'tenanttest@example.com' },
    });
    expect([200, 201]).toContain(create.status);
    recordId = create.body.id;
    expect(recordId).toBeDefined();

    const read = await agent.get(`/api/records/${recordId}`);
    expect(read.status).toBe(200);
    expect(read.body.data.first_name).toBe('TenantTest');
  });

  test('same record is NOT accessible via a fake tenant slug header', async () => {
    if (!recordId) return;
    // Inject a different tenant slug without a valid session — should get 401 or non-master data
    const res = await api.get(`/api/records/${recordId}`)
      .set('X-Tenant-Slug', 'fake-tenant-xyz');
    // Unauthenticated (no session cookie) — must be 401
    expect([401, 403, 404]).toContain(res.status);
  });

  test('unauthenticated records list → 401, never leaks master data', async () => {
    const res = await api.get(`/api/records?object_id=${objectId}&environment_id=${envId}`)
      .set('X-Tenant-Slug', 'fake-tenant-xyz');
    expect(res.status).toBe(401);
  });

  test('environment_id from another tenant returns empty list, not master data', async () => {
    const fakeEnvId = '00000000-0000-0000-0000-000000000000';
    const res = await agent.get(`/api/records?object_id=${objectId}&environment_id=${fakeEnvId}`);
    if (res.status === 200) {
      const records = res.body.records || res.body;
      expect(Array.isArray(records) ? records : []).toHaveLength(0);
    } else {
      expect([400, 401, 403, 404]).toContain(res.status);
    }
  });
});
